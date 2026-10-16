"""Folder and form 145 metadata, using the same field names as the simulator."""

from app.models.candidate import Candidate
from app.services.document_catalog import (
    FORMULARIO_145_ID_FIELD,
    REQUEST_NO,
    REQUEST_YES,
    document_classes,
)

COMPASS_FOLDER_FIELD_NAMES = [
    "salutation", "first_name", "first_surname", "second_surname", "identity_card_number",
    "email", "DNI_ANVERSO", "DNI_REVERSO", "PASAPORTE_ORIGEN_ANVERSO", "PASAPORTE_ORIGEN_REVERSO",
    "CERTIFICADO_DELITOS_SEXUALES", "CERTIFICADO_DELITOS_SEXUALES_EXTRANJERO", "dietitian_diploma",
    "drivers_license_front", "drivers_license_back", "unemployment_certificate", "CV",
    "disability_certificate", "CERTIFICADO_VIOLENCIA_GENERO", "CERTIFICADO_EXCLUSION_SOCIAL",
    "type_of_identity_card", "exp_date", "date_of_birth", "born_in", "personal_situation",
    "cellular", "street_type", "street_name", "number", "door", "zip_code", "city", "province",
    "country", "disability_class", "disability_range_degree", "social_security_affiliation_no",
    "unemployed_status1", "iban", "MOTIVO_RECHAZO", "FORMULARIO_145", FORMULARIO_145_ID_FIELD,
    "VORNA", "NACHN", "NAME2", "PERID", "EMAIL", "STEP", "DESEMP", "SIT_M", "SIT_C", "SIT_1",
    "CAT_M_3", "CAT_M_6", "CAT_M_A", "RED_RI", "AYD_VIV",
]

FORMULARIO_145_FIELD_NAMES = [
    "TELNR", "MOVGEO", "NIF_C", "DAN_1", "DAA_1", "DAN_2", "DAA_2", "DAN_3", "DAA_3", "DAN_4",
    "DAA_4", "DAN_5", "DAA_5", "DAN_6", "DAA_6", "DAN_7", "DAA_7", "DAN_8", "DAA_8", "DAN_9",
    "DAA_9", "SIT_M", "SIT_C", "SIT_1", "CAT_M_0", "CAT_M_3", "CAT_M_6", "CAT_M_A", "RED_RI",
    "DM3_1", "DM6_1", "DYT_1", "DCOM_1", "DM3_2", "DM6_2", "DYT_2", "DCOM_2", "DM3_3", "DM6_3",
    "DYT_3", "DCOM_3", "DM3_4", "DM6_4", "DYT_4", "DCOM_4", "DM3_5", "DM6_5", "DYT_5", "DCOM_5",
    "DM3_6", "DM6_6", "DYT_6", "DCOM_6", "DM3_7", "DM6_7", "DYT_7", "DCOM_7", "DM3_8", "DM6_8",
    "DYT_8", "DCOM_8", "DM3_9", "DM6_9", "DYT_9", "DCOM_9", "PENCOM", "ANUALI", "AAN_1", "AAN_2",
    "AAN_3", "AAN_4", "AAN_5", "AAN_6", "AAN_7", "AM3_1", "AM6_1", "AYT_1", "AFC_1", "AM3_2",
    "AM6_2", "AYT_2", "AFC_2", "AM3_3", "AM6_3", "AYT_3", "AFC_3", "AM3_4", "AM6_4", "AYT_4",
    "AFC_4", "AM3_5", "AM6_5", "AYT_5", "AFC_5", "AM3_6", "AM6_6", "AYT_6", "AFC_6", "AM3_7",
    "AM6_7", "AYT_7", "AFC_7", "AYD_VIV",
]

FORM_145_BOOLS = {
    "SIT_M", "SIT_C", "SIT_1", "CAT_M_0", "CAT_M_3", "CAT_M_6", "CAT_M_A", "RED_RI", "AYD_VIV",
    "DM3_1", "DM3_2", "DM3_3", "DM3_4", "DM3_5", "DM3_6", "DM3_7", "DM3_8", "DM3_9",
    "DM6_1", "DM6_2", "DM6_3", "DM6_4", "DM6_5", "DM6_6", "DM6_7", "DM6_8", "DM6_9",
    "DYT_1", "DYT_2", "DYT_3", "DYT_4", "DYT_5", "DYT_6", "DYT_7", "DYT_8", "DYT_9",
    "DCOM_1", "DCOM_2", "DCOM_3", "DCOM_4", "DCOM_5", "DCOM_6", "DCOM_7", "DCOM_8", "DCOM_9",
    "AM3_1", "AM3_2", "AM3_3", "AM3_4", "AM3_5", "AM3_6", "AM3_7",
    "AM6_1", "AM6_2", "AM6_3", "AM6_4", "AM6_5", "AM6_6", "AM6_7",
    "AYT_1", "AYT_2", "AYT_3", "AYT_4", "AYT_5", "AYT_6", "AYT_7",
}


def _put(values: dict, *names: str, value: object) -> None:
    if value is None or value == "":
        return
    for name in names:
        values[name] = value


def _yes(flag: bool) -> bool:
    return bool(flag)


def candidate_values(candidate: Candidate) -> dict:
    """Values addressable by Doxis name or Kulteo code."""
    values = dict(candidate.source_fields or {})
    _put(values, "first_name", "VORNA", value=candidate.first_name)
    _put(values, "first_surname", "NACHN", value=candidate.last_name)
    _put(values, "second_surname", "NAME2", value=candidate.second_last_name)
    _put(values, "identity_card_number", "PERID", value=candidate.national_id)
    _put(values, "email", "EMAIL", value=candidate.email)
    _put(values, "cellular", "TELNR", value=candidate.phone)
    _put(values, "date_of_birth", "GBDAT", value=candidate.birth_date)
    _put(values, "salutation", "GENDER", value=candidate.gender)
    _put(values, "born_in", "NATIO", value=candidate.nationality)
    _put(values, "personal_situation", "FATXT", value=candidate.civil_status)
    _put(values, "street_type", "STRDS", value=candidate.street_type)
    _put(values, "street_name", "STRAS", value=candidate.street)
    _put(values, "number", "HSNMR", value=candidate.street_number)
    _put(values, "door", "POSTA", value=candidate.floor)
    _put(values, "zip_code", "PSTLZ", value=candidate.postal_code)
    _put(values, "city", "ORT01", value=candidate.city)
    _put(values, "province", "STATE", value=candidate.province)
    _put(values, "country", "LAND1", value=candidate.country)
    _put(values, "social_security_affiliation_no", "NRAFI", value=candidate.social_security_number)
    _put(values, "iban", "IBAN00", value=candidate.iban)
    _put(values, "exp_date", "ARBER", value=candidate.work_permit_end)
    _put(values, "unemployed_status1", "DESEMP", value=candidate.unemployed)
    _put(values, "disability_class", "DISTY", value=candidate.disability_type)
    _put(values, "disability_range_degree", "SBPRO", value=candidate.disability_percent)
    _put(values, "type_of_identity_card", "ID_TYPE", value=candidate.id_type)
    _put(values, "MOTIVO_RECHAZO", value=candidate.rejection_reason)
    _put(values, "STEP", value=candidate.step)
    _put(values, "SIT_M", value=_yes(candidate.family_single_with_children))
    _put(values, "SIT_C", value=_yes(candidate.family_spouse_low_income))
    _put(values, "NIF_C", value=candidate.spouse_national_id)
    _put(values, "SIT_1", value=_yes(candidate.family_other))
    _put(values, "CAT_M_0", value=_yes(candidate.disability_recognized))
    _put(values, "CAT_M_3", value=_yes(candidate.own_disability_33))
    _put(values, "CAT_M_6", value=_yes(candidate.own_disability_65))
    _put(values, "CAT_M_A", value=_yes(candidate.own_disability_help))
    _put(values, "MOVGEO", value=candidate.geographic_move_date)
    _put(values, "RED_RI", value=_yes(candidate.irregular_income))
    _put(values, "PENCOM", value=candidate.compensatory_pension)
    _put(values, "ANUALI", value=candidate.child_support)
    _put(values, "AYD_VIV", value=_yes(candidate.housing_deduction))

    for index, child in enumerate(candidate.children, start=1):
        _put(values, f"DAN_{index}", value=child.birth_date)
        _put(values, f"DAA_{index}", value=child.adoption_date)
        _put(values, f"DM3_{index}", value=_yes(child.disability_33))
        _put(values, f"DM6_{index}", value=_yes(child.disability_65))
        _put(values, f"DYT_{index}", value=_yes(child.needs_help))
        _put(values, f"DCOM_{index}", value=_yes(child.lives_only_with_you))
    for index, person in enumerate(candidate.ascendants, start=1):
        _put(values, f"AAN_{index}", value=person.birth_date)
        _put(values, f"AM3_{index}", value=_yes(person.disability_33))
        _put(values, f"AM6_{index}", value=_yes(person.disability_65))
        _put(values, f"AYT_{index}", value=_yes(person.needs_help))
        _put(values, f"AFC_{index}", value=person.cohabitation_share)
    return values


def _format(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def expediente_metadata(candidate: Candidate, formulario_145_id: str | None) -> list[dict[str, str]]:
    values = candidate_values(candidate)
    requested = set(candidate.required_documents)
    flags = {}
    for item in document_classes():
        selected = item.from_template or any(flag in requested for flag in item.kulteo_flags)
        flags[item.compass_flag] = REQUEST_YES if selected else REQUEST_NO
    if formulario_145_id:
        values[FORMULARIO_145_ID_FIELD] = formulario_145_id
    entries = []
    seen: set[str] = set()
    for name in COMPASS_FOLDER_FIELD_NAMES:
        if name in seen or name == "id_object":
            continue
        raw = flags.get(name, values.get(name))
        if raw is None or raw == "":
            continue
        seen.add(name)
        entries.append({"name": name, "value": _format(raw)})
    return entries


def formulario_145_metadata(candidate: Candidate) -> list[dict[str, str]]:
    values = candidate_values(candidate)
    entries = []
    for name in FORMULARIO_145_FIELD_NAMES:
        raw = values.get(name)
        if raw is None or raw == "":
            if name in FORM_145_BOOLS:
                raw = False
            else:
                continue
        entries.append({"name": name, "value": _format(raw)})
    return entries
