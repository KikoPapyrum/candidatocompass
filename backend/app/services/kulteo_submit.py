"""Create the candidate documents in Kulteo, same sequence as the simulator."""

import base64
import logging
import mimetypes
import re
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


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "X-Tenant": settings.kulteo_tenant or "compass"}
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
        for document_type, record in stored.items():
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

        formulario_145_id = None
        for item in document_classes():
            if not item.from_template:
                continue
            extra = formulario_145_metadata(candidate) if item.id == "FORMULARIO_145" else []
            created = await _request(
                "POST",
                collection,
                {
                    "name": item.compass_typology or item.label,
                    "type": "document",
                    "typology": item.compass_typology or item.label,
                    "parent_folder": expediente_id,
                    "metadata": [dict(DOCUMENT_ORIGIN), *extra],
                },
                {200, 201},
            )
            created_id = _item_id(created)
            if item.id == "FORMULARIO_145" and created_id:
                formulario_145_id = created_id
                candidate.formulario_145_item_id = created_id

        metadata = expediente_metadata(candidate, formulario_145_id)
        if metadata:
            await _request("PUT", folder_url, {"metadata": metadata}, {200})
        callback_url = f"{folder_url}/workflow-callback"
        await _request("POST", callback_url, {"payload": {"resp": "ok"}}, {200})
        return formulario_145_id
