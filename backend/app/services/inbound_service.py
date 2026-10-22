"""Create and update the candidate the way Kulteo calls the simulator."""

from datetime import datetime

from app.models.candidate import Candidate
from app.services.candidate_service import EDITABLE_STEPS
from app.services.document_catalog import class_for_flag, flag_for_request
from app.utils.exceptions import DomainError
from app.utils.validators import normalize_national_id

TRUTHY = {"SI", "SÍ", "YES", "TRUE", "1"}
OPEN_STEP = "Callback - Pendiente Candidato"

# Incoming name -> candidate attribute. Both Doxis and Kulteo codes.
ATTRIBUTE_FIELDS = {
    "VORNA": "first_name",
    "first_name": "first_name",
    "NACHN": "last_name",
    "first_surname": "last_name",
    "NAME2": "second_last_name",
    "second_surname": "second_last_name",
    "EMAIL": "email",
    "email": "email",
    "TELNR": "phone",
    "cellular": "phone",
    "GBDAT": "birth_date",
    "date_of_birth": "birth_date",
    "GENDER": "gender",
    "salutation": "gender",
    "NATIO": "nationality",
    "born_in": "nationality",
    "FATXT": "civil_status",
    "personal_situation": "civil_status",
    "STRDS": "street_type",
    "street_type": "street_type",
    "STRAS": "street",
    "street_name": "street",
    "HSNMR": "street_number",
    "number": "street_number",
    "POSTA": "floor",
    "door": "floor",
    "PSTLZ": "postal_code",
    "zip_code": "postal_code",
    "ORT01": "city",
    "city": "city",
    "STATE": "province",
    "province": "province",
    "LAND1": "country",
    "country": "country",
    "NRAFI": "social_security_number",
    "social_security_affiliation_no": "social_security_number",
    "IBAN00": "iban",
    "iban": "iban",
    "ARBER": "work_permit_end",
    "exp_date": "work_permit_end",
    "DESEMP": "unemployed",
    "unemployed_status1": "unemployed",
    "MINUS": "disability",
    "DISTY": "disability_type",
    "disability_class": "disability_type",
    "SBPRO": "disability_percent",
    "disability_range_degree": "disability_percent",
    "ID_TYPE": "id_type",
    "type_of_identity_card": "id_type",
    "MOTIVO_RECHAZO": "rejection_reason",
    "STEP": "step",
}


def _unwrap(value: object) -> object:
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _truthy(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().upper() in TRUTHY


def _payload_data(payload: dict) -> dict:
    metadata = payload.get("metadata")
    return metadata if isinstance(metadata, dict) else payload


class InboundService:
    """Upsert a candidate from the Kulteo HTTP action."""

    @staticmethod
    async def upsert(payload: dict, national_id: str | None = None) -> Candidate:
        data = _payload_data(payload)
        identity = national_id or data.get("identity_card_number") or data.get("PERID") or data.get("id")
        identity = normalize_national_id(str(identity or ""))
        if not identity:
            raise DomainError("identity_card_number is required")

        requested: set[str] = set()
        explicit = data.get("requested_document_classes") or payload.get("requested_document_classes")
        if isinstance(explicit, list):
            for item in explicit:
                flag = flag_for_request(str(item))
                if flag:
                    requested.add(flag)

        attributes: dict[str, str] = {}
        source_fields: dict[str, str] = {}
        for raw_key, raw_value in data.items():
            if raw_key in {"requested_document_classes", "documents", "metadata"}:
                continue
            value = _unwrap(raw_value)
            if class_for_flag(raw_key) is not None and raw_key not in ATTRIBUTE_FIELDS:
                if _truthy(value):
                    flag = flag_for_request(raw_key)
                    if flag:
                        requested.add(flag)
                continue
            attribute = ATTRIBUTE_FIELDS.get(raw_key)
            text = _text(value)
            if text is None:
                continue
            source_fields[raw_key] = text
            if attribute:
                attributes[attribute] = text

        object_id = _text(data.get("id_object") or data.get("object_id") or attributes.get("object_id"))
        now = datetime.utcnow()
        candidate = await Candidate.find_one(Candidate.national_id == identity)
        if candidate is None:
            candidate = Candidate(
                national_id=identity,
                object_id=object_id or "",
                step=attributes.get("step") or OPEN_STEP,
                required_documents=sorted(requested),
                step_warnings=["documentos"] if requested else [],
                warned_documents=sorted(requested),
                source_fields=source_fields,
                created_at=now,
                updated_at=now,
            )
            for key, value in attributes.items():
                if key != "step":
                    setattr(candidate, key, value)
            await candidate.insert()
            return candidate

        if object_id:
            candidate.object_id = object_id
        for key, value in attributes.items():
            setattr(candidate, key, value)
        if requested:
            candidate.required_documents = sorted(set(candidate.required_documents) | requested)
            if "documentos" not in candidate.step_warnings:
                candidate.step_warnings.append("documentos")
            candidate.warned_documents = sorted(set(candidate.warned_documents) | requested)
            if candidate.step not in EDITABLE_STEPS:
                candidate.step = OPEN_STEP
        candidate.source_fields = {**candidate.source_fields, **source_fields}
        candidate.updated_at = now
        await candidate.save()
        return candidate

    @staticmethod
    async def delete(national_id: str) -> bool:
        candidate = await Candidate.find_one(Candidate.national_id == normalize_national_id(national_id))
        if candidate is None:
            return False
        await candidate.delete()
        return True
