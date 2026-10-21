"""Keep the local offer cache aligned with Kulteo."""

import asyncio
import logging
from datetime import datetime

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.document import CandidateDocument
from app.models.offer import JobOffer
from app.services.candidate_service import DISABILITY_CERTIFICATE
from app.services.kulteo_offers import fetch_offer_rows, parse_offer_row

logger = logging.getLogger(__name__)
_lock = asyncio.Lock()


def merge_required_documents(candidate: Candidate, offer_documents: list[str]) -> list[str]:
    """Use the offer checklist and keep a disability certificate the candidate already triggered."""
    documents = list(offer_documents)
    if DISABILITY_CERTIFICATE in candidate.required_documents and DISABILITY_CERTIFICATE not in documents:
        documents.append(DISABILITY_CERTIFICATE)
    return documents


async def _apply_active_offer(offer: JobOffer) -> None:
    candidates = await Candidate.find(Candidate.active_offer_code == offer.code).to_list()
    for candidate in candidates:
        uploaded = {
            item.document_type
            for item in await CandidateDocument.find(
                CandidateDocument.national_id == candidate.national_id
            ).to_list()
        }
        candidate.required_documents = merge_required_documents(candidate, offer.required_documents)
        if candidate.documents_complete and any(
            document not in uploaded for document in candidate.required_documents
        ):
            candidate.documents_complete = False
        candidate.updated_at = datetime.utcnow()
        await candidate.save()


async def _sync_offers() -> int:
    rows = await fetch_offer_rows()
    if not rows:
        return 0
    seen: set[str] = set()
    saved = 0
    now = datetime.utcnow()
    for row in rows:
        parsed = parse_offer_row(row)
        if parsed is None or parsed.code in seen:
            continue
        seen.add(parsed.code)
        offer = await JobOffer.find_one(JobOffer.code == parsed.code)
        if offer is None:
            offer = JobOffer(code=parsed.code, title=parsed.title)
        offer.kulteo_item_id = parsed.kulteo_item_id
        offer.title = parsed.title
        offer.description = parsed.description
        offer.open = parsed.open
        offer.required_documents = parsed.required_documents
        offer.synced_at = now
        await offer.save()
        await _apply_active_offer(offer)
        saved += 1
    if saved == 0:
        logger.warning("Kulteo returned rows, but none matched the offer typology")
        return 0
    for offer in await JobOffer.find_all().to_list():
        if offer.code not in seen and offer.open:
            offer.open = False
            offer.synced_at = now
            await offer.save()
    logger.info("Offer sync stored %s offers", saved)
    return saved


async def sync_offers() -> int:
    """Refresh every cached offer. Concurrent callers share one request."""
    async with _lock:
        return await _sync_offers()


async def offer_sync_loop(interval_seconds: int) -> None:
    """Refresh the cache on startup and then on the given interval."""
    while True:
        try:
            await sync_offers()
        except Exception:
            logger.exception("Offer sync failed")
        await asyncio.sleep(interval_seconds)
