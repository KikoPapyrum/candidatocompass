"""Read job offers from Kulteo. This does not create applications there."""

import logging
from dataclasses import dataclass

import httpx

from app.config import settings
from app.services.document_catalog import document_classes, flag_for_request
from app.services.inbound_service import _truthy, _unwrap
from app.services.kulteo_submit import _headers, items_collection_url

logger = logging.getLogger(__name__)

CODE_KEYS = (
    "OFERTA_ID",
    "ID_OFERTA",
    "CODIGO",
    "codigo",
    "code",
    "offer_code",
    "offer_id",
    "id",
    "_id",
)
TITLE_KEYS = ("TITULO", "title", "name", "PUESTO", "DENOMINACION", "puesto")
DESCRIPTION_KEYS = ("DESCRIPCION", "description", "descripcion", "DETALLE")
CLOSED_STATES = {"NO", "FALSE", "0", "CERRADA", "CERRADO", "CLOSED", "INACTIVA", "INACTIVO", "BAJA"}


@dataclass(frozen=True)
class ParsedOffer:
    """Offer fields extracted from one Kulteo row."""

    code: str
    kulteo_item_id: str
    title: str
    description: str
    open: bool
    required_documents: list[str]


def offers_request() -> tuple[str, dict[str, str] | None]:
    """Return the list URL and query. An explicit URL is used as-is."""
    explicit = (settings.kulteo_offers_url or "").strip()
    if explicit:
        return explicit, None
    collection = items_collection_url()
    typology = (settings.kulteo_offers_typology or "OFERTA").strip()
    return collection, {"typology": typology} if typology else None


def extract_rows(body: object) -> list[dict]:
    """Accept a list or the envelopes Kulteo uses for collections."""
    if isinstance(body, list):
        return [item for item in body if isinstance(item, dict)]
    if not isinstance(body, dict):
        return []
    for key in ("items", "rows", "data", "results", "documents"):
        value = body.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    if "metadata" in body or "id" in body or "_id" in body:
        return [body]
    return []


def _cell(value: object) -> str:
    unwrapped = _unwrap(value)
    if unwrapped is None:
        return ""
    return str(unwrapped).strip()


def _values(row: dict) -> dict[str, object]:
    values: dict[str, object] = {}
    for key, value in row.items():
        if key == "metadata" or isinstance(value, (dict, list)):
            continue
        values[str(key)] = value
    metadata = row.get("metadata")
    if isinstance(metadata, dict):
        for key, value in metadata.items():
            values[str(key)] = _unwrap(value)
    elif isinstance(metadata, list):
        for item in metadata:
            if isinstance(item, dict) and item.get("name") is not None:
                values[str(item["name"])] = _unwrap(item.get("value"))
    return values


def _first(values: dict[str, object], keys: tuple[str, ...]) -> str:
    for key in keys:
        text = _cell(values.get(key))
        if text:
            return text
    return ""


def required_documents(values: dict[str, object]) -> list[str]:
    """Document codes whose Sí/No flag is set on the offer."""
    required: list[str] = []
    for item in document_classes():
        if item.from_template:
            continue
        flags = item.kulteo_flags or (item.compass_flag,)
        marked = any(_truthy(values.get(flag)) for flag in flags)
        if not marked and item.compass_flag not in flags:
            marked = _truthy(values.get(item.compass_flag))
        if not marked:
            continue
        code = flag_for_request(item.id)
        if code and code not in required:
            required.append(code)
    return required


def parse_offer_row(row: dict) -> ParsedOffer | None:
    """Turn one Kulteo item into an offer. Rows of another typology are ignored."""
    values = _values(row)
    typology = _cell(values.get("typology") or values.get("TIPOLOGIA") or row.get("typology"))
    expected = (settings.kulteo_offers_typology or "").strip()
    explicit_url = bool((settings.kulteo_offers_url or "").strip())
    if typology and expected and typology.casefold() != expected.casefold() and not explicit_url:
        return None
    if not typology and not explicit_url:
        return None
    code = _first(values, CODE_KEYS)
    if not code:
        return None
    item_id = _cell(row.get("id") or row.get("_id") or values.get("id"))
    title = _first(values, TITLE_KEYS) or f"Oferta {code}"
    state = _cell(values.get("ESTADO") or values.get("status") or values.get("ACTIVA")).upper()
    return ParsedOffer(
        code=code,
        kulteo_item_id=item_id,
        title=title,
        description=_first(values, DESCRIPTION_KEYS),
        open=state not in CLOSED_STATES,
        required_documents=required_documents(values),
    )


async def fetch_offer_rows() -> list[dict]:
    """Download the offer list. An empty Kulteo URL yields no rows."""
    url, params = offers_request()
    if not url:
        logger.info("KULTEO_BASE_URL is empty; offer sync skipped")
        return []
    if not settings.kulteo_api_key:
        logger.warning("Offer sync skipped: KULTEO_API_KEY is empty")
        return []
    logger.info("Kulteo GET %s", url)
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=_headers(), params=params)
    except httpx.HTTPError as exc:
        logger.warning("Offer sync failed: %s", exc)
        return []
    if response.status_code != 200:
        logger.warning("Offer sync failed: Kulteo responded %s", response.status_code)
        return []
    try:
        body = response.json()
    except ValueError:
        logger.warning("Offer sync failed: Kulteo did not return JSON")
        return []
    return extract_rows(body)
