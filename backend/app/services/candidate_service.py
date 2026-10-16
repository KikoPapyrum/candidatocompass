"""Rules for editing the hiring file."""

import re
from datetime import date, datetime

from app.models.candidate import Ascendant, Candidate, Child
from app.schemas.candidate import PersonalDataUpdate, TaxDataUpdate
from app.utils.catalogs import option_ids, province_ids
from app.utils.exceptions import DomainError
from app.utils.validators import (
    is_amount,
    is_dni,
    is_valid_email,
    is_valid_iban,
    is_valid_mobile,
    is_valid_nass,
    is_valid_national_id,
    normalize_national_id,
    parse_iso_date,
)

EDITABLE_STEPS = {
    "Callback - Subida Finalizada",
    "Callback - Pendiente Candidato",
}
DISABILITY_CERTIFICATE = "CERTIFICADO_MINUSVALIA"
MAX_CHILDREN = 9
MAX_ASCENDANTS = 7


def ensure_editable(candidate: Candidate) -> None:
    """Block changes once Compass is reviewing the file."""
    if candidate.step not in EDITABLE_STEPS:
        raise DomainError(
            "La aplicación está bloqueada. El personal de Compass está verificando la información.",
            status_code=409,
        )


def _require_option(value: str, catalog: str, label: str) -> None:
    if value not in option_ids(catalog):
        raise DomainError(f"{label} no es válido.")


def _clean_children(children: list[Child]) -> list[Child]:
    cleaned = []
    for child in children:
        empty = (
            not child.birth_date
            and not child.adoption_date
            and not any(
                [
                    child.disability_33,
                    child.disability_65,
                    child.needs_help,
                    child.lives_only_with_you,
                ]
            )
        )
        if empty:
            continue
        if (child.disability_33 or child.disability_65 or child.needs_help or child.lives_only_with_you) and not child.birth_date:
            raise DomainError("Si marcas una casilla de un descendiente, la fecha de nacimiento es obligatoria.")
        if child.disability_33 and child.disability_65:
            raise DomainError("Un descendiente no puede tener los dos grados de discapacidad a la vez.")
        _check_past_date(child.birth_date, "La fecha de nacimiento del descendiente")
        _check_past_date(child.adoption_date, "La fecha de adopción")
        cleaned.append(child)
    if len(cleaned) > MAX_CHILDREN:
        raise DomainError("Puedes informar como máximo 9 descendientes.")
    return cleaned


def _clean_ascendants(ascendants: list[Ascendant]) -> list[Ascendant]:
    cleaned = []
    shares = option_ids("ascendantShares")
    for person in ascendants:
        empty = (
            not person.birth_date
            and not person.cohabitation_share
            and not any([person.disability_33, person.disability_65, person.needs_help])
        )
        if empty:
            continue
        if (person.disability_33 or person.disability_65 or person.needs_help or person.cohabitation_share) and not person.birth_date:
            raise DomainError("Si marcas una casilla de un ascendiente, la fecha de nacimiento es obligatoria.")
        if person.disability_33 and person.disability_65:
            raise DomainError("Un ascendiente no puede tener los dos grados de discapacidad a la vez.")
        if person.cohabitation_share and person.cohabitation_share not in shares:
            raise DomainError("El reparto del mínimo del ascendiente no es válido.")
        _check_past_date(person.birth_date, "La fecha de nacimiento del ascendiente")
        cleaned.append(person)
    if len(cleaned) > MAX_ASCENDANTS:
        raise DomainError("Puedes informar como máximo 7 ascendientes.")
    return cleaned


def _check_past_date(value: str | None, label: str) -> None:
    parsed = parse_iso_date(value)
    if value and parsed is None:
        raise DomainError(f"{label} no es válida.")
    if parsed and parsed > date.today():
        raise DomainError(f"{label} no puede ser posterior a hoy.")


class CandidateService:
    """Save each step of the hiring file."""

    @staticmethod
    async def save_personal(candidate: Candidate, payload: PersonalDataUpdate) -> Candidate:
        ensure_editable(candidate)
        data = payload.model_dump()
        data["first_name"] = data["first_name"].strip()
        data["last_name"] = data["last_name"].strip()
        data["second_last_name"] = (data["second_last_name"] or "").strip() or None
        data["street"] = data["street"].strip()
        data["city"] = data["city"].strip()
        data["email"] = data["email"].strip().lower()
        data["phone"] = re.sub(r"\s+", "", data["phone"])
        data["iban"] = re.sub(r"\s+", "", data["iban"]).upper()
        data["social_security_number"] = re.sub(r"\s+", "", data["social_security_number"])
        data["postal_code"] = data["postal_code"].strip()
        data["street_number"] = (data["street_number"] or "").strip() or None
        data["floor"] = (data["floor"] or "").strip() or None
        data["work_permit_end"] = (data["work_permit_end"] or "").strip() or None

        if not data["first_name"] or len(data["street"]) > 60 or len(data["city"]) > 40:
            raise DomainError("Revisa el nombre, la dirección (máximo 60) y la población (máximo 40).")
        if not is_valid_email(data["email"]):
            raise DomainError("El email no es válido.")
        if not is_valid_mobile(data["phone"]):
            raise DomainError("El teléfono móvil debe tener 9 dígitos.")
        if not is_valid_iban(data["iban"]):
            raise DomainError("El IBAN no es válido.")
        if not is_valid_nass(data["social_security_number"]):
            raise DomainError("El número de afiliación a la Seguridad Social no es válido.")
        birth = parse_iso_date(data["birth_date"])
        if birth is None or birth > date.today():
            raise DomainError("La fecha de nacimiento no es válida.")
        _require_option(data["id_type"], "idTypes", "El tipo de documento")
        _require_option(data["gender"], "genders", "El sexo")
        _require_option(data["nationality"], "nationalities", "La nacionalidad")
        _require_option(data["civil_status"], "civilStatuses", "El estado civil")
        _require_option(data["street_type"], "streetTypes", "El tipo de vía")
        _require_option(data["country"], "countries", "El país")
        _require_option(data["unemployed"], "yesNo", "La situación de desempleo")
        _require_option(data["disability"], "yesNo", "La minusvalía")
        if data["province"] not in province_ids(data["country"]):
            raise DomainError("La provincia no corresponde al país.")
        if data["country"] == "ES" and not re.fullmatch(r"\d{5}", data["postal_code"]):
            raise DomainError("El código postal debe tener 5 dígitos.")
        if data["street_number"] and not re.fullmatch(r"[0-9A-Za-z\-/]{1,10}", data["street_number"]):
            raise DomainError("El número o bloque no es válido.")
        if data["floor"] and len(data["floor"]) > 10:
            raise DomainError("El piso no puede superar 10 caracteres.")

        nie = not is_dni(candidate.national_id)
        permit = parse_iso_date(data["work_permit_end"])
        if data["work_permit_end"] and permit is None:
            raise DomainError("La fecha de fin del permiso de trabajo no es válida.")
        if nie and permit and permit < date.today():
            raise DomainError("La fecha de fin del permiso de trabajo no puede ser anterior a hoy.")
        if not nie:
            data["work_permit_end"] = None

        if data["disability"] == "SI":
            if not data["disability_type"] or data["disability_type"] not in option_ids("disabilityTypes"):
                raise DomainError("Indica el tipo de minusvalía.")
            percent = data["disability_percent"]
            if percent is None or not re.fullmatch(r"\d{1,3}", str(percent)) or not 0 <= int(percent) <= 100:
                raise DomainError("El porcentaje de minusvalía debe estar entre 0 y 100.")
            if DISABILITY_CERTIFICATE not in candidate.required_documents:
                candidate.required_documents.append(DISABILITY_CERTIFICATE)
        else:
            data["disability_type"] = None
            data["disability_percent"] = None
            candidate.required_documents = [
                item for item in candidate.required_documents if item != DISABILITY_CERTIFICATE
            ]

        for key, value in data.items():
            setattr(candidate, key, value)
        candidate.personal_data_complete = True
        candidate.documents_complete = False
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        return candidate

    @staticmethod
    async def save_tax(candidate: Candidate, payload: TaxDataUpdate) -> Candidate:
        ensure_editable(candidate)
        if not candidate.personal_data_complete or not candidate.documents_complete:
            raise DomainError("Completa los datos personales y los documentos antes de los datos fiscales.")
        children = _clean_children(payload.children)
        ascendants = _clean_ascendants(payload.ascendants)
        if payload.family_single_with_children and not children:
            raise DomainError("La situación familiar 1 exige al menos un descendiente.")
        spouse = normalize_national_id(payload.spouse_national_id or "")
        if payload.family_spouse_low_income:
            if not is_valid_national_id(spouse):
                raise DomainError("Indica un DNI/NIE válido del cónyuge.")
        else:
            spouse = spouse or None
            if spouse and not is_valid_national_id(spouse):
                raise DomainError("El DNI/NIE del cónyuge no es válido.")
        move = (payload.geographic_move_date or "").strip() or None
        if move and parse_iso_date(move) is None:
            raise DomainError("La fecha de traslado no es válida.")
        if not is_amount(payload.compensatory_pension) or not is_amount(payload.child_support):
            raise DomainError("Los importes deben ser numéricos. Puedes usar una coma decimal.")
        if payload.own_disability_33 and payload.own_disability_65:
            raise DomainError("No puedes marcar los dos grados de discapacidad a la vez.")

        candidate.family_single_with_children = payload.family_single_with_children
        candidate.family_spouse_low_income = payload.family_spouse_low_income
        candidate.spouse_national_id = spouse or None
        candidate.family_other = payload.family_other
        candidate.disability_recognized = payload.disability_recognized
        candidate.own_disability_33 = payload.own_disability_33
        candidate.own_disability_65 = payload.own_disability_65
        candidate.own_disability_help = payload.own_disability_help
        candidate.geographic_move_date = move
        candidate.irregular_income = payload.irregular_income
        candidate.compensatory_pension = (payload.compensatory_pension or "").strip() or None
        candidate.child_support = (payload.child_support or "").strip() or None
        candidate.housing_deduction = payload.housing_deduction
        candidate.children = children
        candidate.ascendants = ascendants
        candidate.tax_data_complete = True
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        return candidate

    @staticmethod
    async def submit(candidate: Candidate, privacy: bool, email_ok: bool, truth: bool) -> Candidate:
        ensure_editable(candidate)
        if not (candidate.personal_data_complete and candidate.documents_complete and candidate.tax_data_complete):
            raise DomainError("Completa datos, documentos y datos fiscales antes de finalizar.")
        if not (privacy and email_ok and truth):
            raise DomainError("Debes aceptar las tres cláusulas.")
        candidate.step = None
        candidate.rejection_reason = None
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        return candidate
