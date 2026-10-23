"""Create the candidate documents in Kulteo, same sequence as the simulator."""

import base64
import logging
import mimetypes
import re
from datetime import datetime
from typing import Any

import httpx

from app.config import settings
from app.models.candidate import Candidate
from app.models.document import CandidateDocument
from app.services.document_catalog import document_classes
from app.services.document_service import DocumentService
from app.services.kulteo_metadata import expediente_metadata, formulario_145_metadata
from app.utils.exceptions import DomainError

logger = logging.getLogger(__name__)
MONGO_ID = re.compile(r"^[0-9a-fA-F]{24}$")
DOCUMENT_ORIGIN = {"name": "ORIGEN", "value": "APP"}


def items_collection_url() -> str:
    root = (settings.kulteo_base_url or "").strip().rstrip("/")
    if not root:
        return ""
    if root.endswith("/public-api"):
        return f"{root}/items"
    if root.endswith("/api"):
        return f"{root}/public-api/items"
    return f"{root}/api/public-api/items"


def candidate_folder_url() -> str:
    """POST target that opens a Candidato folder and starts its flow."""
    root = (settings.kulteo_base_url or "").strip().rstrip("/")
    if not root:
        return ""
    if root.endswith("/items"):
        return root
    if root.endswith("/public-api"):
        return f"{root}/items"
    return f"{root}/public-api/items"


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "X-Tenant": settings.kulteo_tenant or "compassgroup"}
    if settings.kulteo_api_key:
        headers["X-API-Key"] = settings.kulteo_api_key
    return headers


def _data_uri(filename: str, content_type: str | None, data: bytes) -> str:
    mime = (content_type or "").strip()
    if not mime or mime == "application/octet-stream":
        guessed, _encoding = mimetypes.guess_type(filename)
        mime = guessed or "application/octet-stream"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _item_id(body: Any) -> str | None:
    if not isinstance(body, dict):
        return None
    for key in ("id", "_id"):
        if body.get(key):
            return str(body[key])
    nested = body.get("item")
    if isinstance(nested, dict):
        for key in ("id", "_id"):
            if nested.get(key):
                return str(nested[key])
    return None


async def _request(method: str, url: str, json_body: dict | None, expected: set[int]) -> dict:
    logger.info("Kulteo %s %s", method, url)
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(method, url, headers=_headers(), json=json_body)
    except httpx.HTTPError as exc:
        raise DomainError(f"No se ha podido llamar a Kulteo: {exc}", status_code=502) from exc
    try:
        body = response.json()
    except ValueError:
        body = {"raw": response.text[:2000]}
    if response.status_code not in expected:
        raise DomainError(
            f"Kulteo respondió {response.status_code} en {method} {url}: {body}",
            status_code=502,
        )
    return body if isinstance(body, dict) else {"body": body}


def _candidate_name(candidate: Candidate) -> str:
    parts = [candidate.first_name, candidate.last_name, candidate.second_last_name or ""]
    name = " ".join(part.strip() for part in parts if part and part.strip())
    return name or candidate.national_id


async def create_candidate_folder(candidate: Candidate, email: str, typology: str = "Candidato") -> str | None:
    """Open the person folder in Kulteo. The flow later stores this id on the candidate."""
    if MONGO_ID.match((candidate.object_id or "").strip()):
        return candidate.object_id
    url = candidate_folder_url()
    if not url:
        logger.info("KULTEO_BASE_URL is empty; candidate folder not created for %s", candidate.national_id)
        return None
    if not settings.kulteo_api_key:
        raise DomainError("Falta la API key de Kulteo (kpub_…).")
    parent_folder = (settings.kulteo_parent_folder or "").strip()
    if not parent_folder:
        raise DomainError("Falta la carpeta padre de Kulteo (parent_folder).")
    created = await _request(
        "POST",
        url,
        {
            "name": _candidate_name(candidate),
            "type": "folder",
            "typology": typology,
            "parent_folder": parent_folder,
            "metadata": [
                {"name": "identity_card_number", "value": candidate.national_id},
                {"name": "first_name", "value": candidate.first_name or ""},
                {"name": "email", "value": email.strip().lower()},
            ],
        },
        {201},
    )
    folder_id = _item_id(created)
    if not folder_id:
        raise DomainError("Kulteo no ha devuelto el id de la carpeta.")
    candidate.object_id = folder_id
    candidate.updated_at = datetime.utcnow()
    await candidate.save()
    return folder_id


class KulteoSubmitService:
    """Push files and form 145 into the expediente folder."""

    @staticmethod
    async def submit(candidate: Candidate) -> str | None:
        collection = items_collection_url()
        if not collection:
            logger.info(
                "KULTEO_BASE_URL is empty; candidate %s closed locally",
                candidate.national_id,
            )
            return None
        if not settings.kulteo_api_key:
            raise DomainError("Falta la API key de Kulteo (kpub_…).")
        expediente_id = (candidate.object_id or "").strip()
        if not MONGO_ID.match(expediente_id):
            raise DomainError(
                "id_object debe ser el ObjectId Mongo de la carpeta expediente (24 hex)."
            )

        folder_url = f"{collection}/{expediente_id}"
        folder = await _request("GET", folder_url, None, {200})
        if folder.get("type") and folder.get("type") != "folder":
            raise DomainError(f"El ítem {expediente_id} no es una carpeta.")

        stored = {
            item.document_type: item
            for item in await CandidateDocument.find(
                CandidateDocument.national_id == candidate.national_id
            ).to_list()
        }
        classes = {flag: item for item in document_classes() for flag in item.kulteo_flags}
        pending = _uploads_for_submit(candidate, stored)
        logger.info(
            "Kulteo document push for %s: %s",
            candidate.national_id,
            ", ".join(sorted(pending)) or "(none)",
        )
        for document_type, record in pending.items():
            document_class = classes.get(document_type)
            if document_class is None or document_class.from_template:
                continue
            path = DocumentService.file_path(candidate, record)
            if not path.exists():
                raise DomainError(f"No está el fichero de {document_type}.")
            payload = {
                "name": record.original_filename,
                "type": "document",
                "typology": document_class.compass_typology,
                "parent_folder": expediente_id,
                "metadata": [dict(DOCUMENT_ORIGIN)],
                "file_content": _data_uri(
                    record.original_filename,
                    record.content_type,
                    path.read_bytes(),
                ),
            }
            await _request("POST", collection, payload, {200, 201})

        formulario_145_id = await _upsert_formulario_145(candidate, collection, expediente_id)

        metadata = expediente_metadata(candidate, formulario_145_id)
        if metadata:
            await _request("PUT", folder_url, {"metadata": metadata}, {200})
        await _resume_callback(folder, folder_url)
        candidate.warned_documents = []
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        return formulario_145_id


def _uploads_for_submit(
    candidate: Candidate,
    stored: dict[str, CandidateDocument],
) -> dict[str, CandidateDocument]:
    """Files to create in Kulteo.

    A later request only includes the documents Kulteo just marked.
    The first push has no formulario 145 yet, so it sends every required file.
    """
    if candidate.warned_documents:
        pending = set(candidate.warned_documents)
        missing = sorted(pending - set(stored))
        if missing:
            raise DomainError(f"Faltan documentos por subir: {', '.join(missing)}.")
        return {key: value for key, value in stored.items() if key in pending}
    if MONGO_ID.match((candidate.formulario_145_item_id or "").strip()):
        return {}
    required = set(candidate.required_documents)
    return {key: value for key, value in stored.items() if key in required}


async def _upsert_formulario_145(candidate: Candidate, collection: str, expediente_id: str) -> str | None:
    """Create form 145 the first time and update its metadata afterwards."""
    template = next((item for item in document_classes() if item.id == "FORMULARIO_145"), None)
    if template is None:
        return None
    metadata = [dict(DOCUMENT_ORIGIN), *formulario_145_metadata(candidate)]
    existing = (candidate.formulario_145_item_id or "").strip()
    if MONGO_ID.match(existing):
        await _request("PUT", f"{collection}/{existing}", {"metadata": metadata}, {200})
        return existing
    created = await _request(
        "POST",
        collection,
        {
            "name": template.compass_typology or template.label,
            "type": "document",
            "typology": template.compass_typology or template.label,
            "parent_folder": expediente_id,
            "metadata": metadata,
        },
        {200, 201},
    )
    created_id = _item_id(created)
    if not created_id:
        raise DomainError("Kulteo no ha devuelto el id del formulario 145.")
    candidate.formulario_145_item_id = created_id
    candidate.updated_at = datetime.utcnow()
    await candidate.save()
    return created_id


def _is_callback_wait(folder: dict) -> bool:
    step = str(folder.get("wf_step") or "")
    status = str(folder.get("wf_status") or "").lower()
    return step.lower().startswith("callback") or "callback" in status


async def _resume_callback(folder: dict, folder_url: str) -> None:
    """Advance the flow only when it is parked on a callback node."""
    if not _is_callback_wait(folder):
        logger.info(
            "Kulteo step %s (%s) is not a callback wait; folder content was updated",
            folder.get("wf_step"),
            folder.get("wf_status"),
        )
        return
    try:
        await _request("POST", f"{folder_url}/workflow-callback", {"payload": {"resp": "ok"}}, {200})
    except DomainError as exc:
        if "not a callback wait" not in str(exc):
            raise
        logger.info("Kulteo rejected the callback because the step is no longer waiting")
