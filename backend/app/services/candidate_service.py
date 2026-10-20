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


def _child_has_date(child: Child) -> bool:
    return bool((child.birth_date or "").strip() or (child.adoption_date or "").strip())


def _child_is_empty(child: Child) -> bool:
    return (
        not (child.birth_date or "").strip()
        and not (child.adoption_date or "").strip()
        and not any([child.disability_33, child.disability_65, child.needs_help, child.lives_only_with_you])
    )


def _validate_children(children: list[Child], single_with_children: bool) -> list[Child]:
    """Apply the legacy form 145 checks, in the same order."""
    if single_with_children and (not children or not children[0].lives_only_with_you):
        raise DomainError(
            "Debe informar la fecha de nacimiento/adopción en el apartado: HIJOS Y OTROS DESCENDIENTES "
            "y marcar la casilla COMPUTO POR ENTERO. Si no tiene hijos a su cargo EXCLUSIVAMENTE, "
            'debe cambiar la Situación Familiar elegida a "Situación familiar distinta de las 2 anteriores".'
        )
    for child in children:
        if _child_is_empty(child):
            continue
        has_date = _child_has_date(child)
        if child.lives_only_with_you and not has_date:
            raise DomainError(
                "Debe informar la fecha de nacimiento/adopción en el apartado: HIJOS Y OTROS DESCENDIENTES "
                "ya que ha marcado la casilla COMPUTO POR ENTERO. Si no tiene hijos a su cargo EXCLUSIVAMENTE, "
                "desmarque la casilla COMPUTO POR ENTERO."
            )
        if (child.disability_33 or child.disability_65 or child.needs_help) and not has_date:
            raise DomainError(
                "Debe informar la fecha de nacimiento/adopción en el apartado: HIJOS Y OTROS DESCENDIENTES "
                "ya que ha marcado alguna casilla de discapacidad. Si no tiene hijos a su cargo, "
                "desmarque todas las casillas de discapacidad."
            )
        if child.needs_help and not child.disability_33 and not child.disability_65:
            raise DomainError(
                "Ha acreditado la necesitad de ayuda de terceras persona o movilida reducida "
                "pero no ha seleccionado el grado de discapacidad de uno de sus hijos u otros descendientes"
            )
        if child.disability_33 and child.disability_65:
            raise DomainError(
                "Debe seleccionar solamente una opción de grado de minusvalia para uno de sus hijos "
                "ya que ha marcado las dos. Si no tiene hijos a su cargo, desmarque la casilla COMPUTO POR ENTERO."
            )
        _check_past_date(child.birth_date, "La fecha de nacimiento del descendiente")
        _check_past_date(child.adoption_date, "La fecha de adopción")
    if single_with_children and (not children or not _child_has_date(children[0])):
        raise DomainError(
            "Si ha indicado que sus hijos dependen de Ud, debe de marcar la casilla COMPUTO POR ENTERO "
            "por cada hijo y poner su fecha de nacimiento/adopción en la seccion: "
            "HIJOS Y OTROS DESCENDIENTES MENORES DE 25 AÑOS ..."
        )
    cleaned = [child for child in children if not _child_is_empty(child)]
    if len(cleaned) > MAX_CHILDREN:
        raise DomainError("Puedes informar como máximo 9 descendientes.")
    return cleaned


def _ascendant_is_empty(person: Ascendant) -> bool:
    return (
        not (person.birth_date or "").strip()
        and not (person.cohabitation_share or "").strip()
        and not any([person.disability_33, person.disability_65, person.needs_help])
    )


def _validate_ascendants(ascendants: list[Ascendant]) -> list[Ascendant]:
    """Apply the legacy ascendant date check and drop blank rows."""
    if ascendants:
        first = ascendants[0]
        indicated = (
            first.disability_33
            or first.disability_65
            or first.needs_help
            or bool((first.cohabitation_share or "").strip())
        )
        if not (first.birth_date or "").strip() and indicated:
            raise DomainError(
                "Si ha indicado que tiene ascendientes que dependen de Ud.  "
                "Debe de introducir  su fecha de nacimiento."
            )
    cleaned = []
    shares = option_ids("ascendantShares")
    for person in ascendants:
        if _ascendant_is_empty(person):
            continue
        if person.disability_33 and person.disability_65:
            raise DomainError(
                "Debe seleccionar solamente una opción de grado de minusvalia para uno de sus ascendientes."
            )
        if person.cohabitation_share and person.cohabitation_share not in shares:
            raise DomainError("El reparto del mínimo del ascendiente no es válido.")
        _check_past_date(person.birth_date, "La fecha de nacimiento del ascendiente")
        cleaned.append(person)
    if len(cleaned) > MAX_ASCENDANTS:
        raise DomainError("Puedes informar como máximo 7 ascendientes.")
    return cleaned


def _spouse_id_message(value: str) -> str | None:
    """Return the legacy DNI/NIE message, or None when the value is acceptable."""
    national_id = normalize_national_id(value)
    if len(national_id) < 9:
        return "Complete el DNI/NIE con todos los digitos."
    if not re.fullmatch(r"[XYZ]?\d{5,8}[A-Z]", national_id):
        return "Formato Erroneo"
    if not is_valid_national_id(national_id):
        return "DNI/NIE Erroneo"
    return None


def _validate_family(payload: TaxDataUpdate, spouse: str) -> None:
    single = payload.family_single_with_children
    married = payload.family_spouse_low_income
    other = payload.family_other
    one_choice = (
        (single and not married and not other)
        or (not single and married and not other)
        or (not single and not married and other)
    )
    if not one_choice:
        raise DomainError(
            "Recuerde: Debe seleccionar un solo valor sobre su Situación Familiar. "
            "(Soltero, Casado, etc). La primera seccion del formulario."
        )
    if not single and married and not other and not spouse:
        raise DomainError(
            "ERROR: Situación Familiar. Si valida que se encuentra casado/a "
            "ha de introducir el NIF de su conyuge OBLIGATORIAMENTE."
        )
    if not single and not married and not other and spouse:
        raise DomainError(
            "ERROR: Situación Familiar. Ha introducido el CIF del conyuje sin validar el estado Casado/a."
        )
    accepted = (
        (single and not married and not other and not spouse)
        or (not single and married and not other and spouse)
        or (not single and not married and other and not spouse)
    )
    if not accepted:
        raise DomainError(
            "ERROR: Situación Familiar. Si introduce el NIF del conyuje valide el estado Casado/a."
        )
    if spouse:
        message = _spouse_id_message(spouse)
        if message:
            raise DomainError(message)


def _validate_disability(payload: TaxDataUpdate) -> None:
    recognized = payload.disability_recognized
    from_33 = payload.own_disability_33
    from_65 = payload.own_disability_65
    needs_help = payload.own_disability_help
    if not recognized and not from_33 and not from_65 and not needs_help:
        return
    if (recognized and not from_33 and not from_65) or (not recognized and from_33 and not from_65) or (
        not recognized and not from_33 and from_65
    ):
        return
    if not recognized and not from_33 and not from_65 and needs_help:
        raise DomainError(
            'ERROR Sección: Discapacidad. Ademas de validar que le cuidan terceros, debe de selecionar '
            'uno de los tres estados: "reconocido",  "de 33% a 65%" o  "superior a 65%"'
        )
    raise DomainError(
        'ERROR Sección: Discapacidad. Solo puede validar uno de los tres estados: '
        '"reconocido",  "de 33% a 65%" o  "superior a 65%"'
    )


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
        children = _validate_children(payload.children, payload.family_single_with_children)
        ascendants = _validate_ascendants(payload.ascendants)
        spouse = normalize_national_id(payload.spouse_national_id or "")
        _validate_family(payload, spouse)
        _validate_disability(payload)
        if not payload.family_spouse_low_income:
            spouse = spouse or ""
        move = (payload.geographic_move_date or "").strip() or None
        if move and parse_iso_date(move) is None:
            raise DomainError("Fecha erronea YYYY/mm/dd")
        if not is_amount(payload.compensatory_pension) or not is_amount(payload.child_support):
            raise DomainError("Solo numeros seprados por comas para los decimales. Sin puntuacion de miles")

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
