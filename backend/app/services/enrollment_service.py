"""Inscription in a cached offer. Nothing is created in Kulteo or SuccessFactors."""

from datetime import datetime

from pymongo.errors import DuplicateKeyError

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.offer import JobOffer
from app.models.user import User
from app.schemas.offer import EnrollRequest
from app.services.auth_service import AuthService
from app.services.inbound_service import OPEN_STEP
from app.services.offer_sync import merge_required_documents, sync_offers
from app.utils.exceptions import DomainError
from app.utils.validators import is_valid_mobile, normalize_national_id


async def load_offer(code: str) -> JobOffer:
    """Return the cached offer, refreshing from Kulteo when the code is unknown."""
    offer_code = (code or "").strip()
    offer = await JobOffer.find_one(JobOffer.code == offer_code)
    if offer is None:
        await sync_offers()
        offer = await JobOffer.find_one(JobOffer.code == offer_code)
    if offer is None:
        raise DomainError("Esta oferta no está disponible.", status_code=404)
    return offer


class EnrollmentService:
    """Create the local application and finish the account registration."""

    @staticmethod
    async def enroll(offer: JobOffer, payload: EnrollRequest) -> tuple[str, str | None, User]:
        if not offer.open:
            raise DomainError("Esta oferta ya no admite inscripciones.")
        national_id = normalize_national_id(payload.national_id)
        phone = "".join(payload.phone.split())
        if not is_valid_mobile(phone):
            raise DomainError("El móvil debe tener 9 dígitos.")
        first_name = payload.first_name.strip()
        last_name = payload.last_name.strip()
        if not first_name or not last_name:
            raise DomainError("Indica nombre y apellidos.")
        second_last_name = (payload.second_last_name or "").strip() or None
        email = payload.email.strip().lower()

        status, token, user = await AuthService.open_account(national_id, email, payload.password)

        created = False
        application = Application(national_id=national_id, offer_code=offer.code)
        try:
            await application.insert()
            created = True
        except DuplicateKeyError:
            created = False
        candidate = await Candidate.find_one(Candidate.national_id == national_id)
        if created or candidate is None:
            if candidate is None:
                candidate = Candidate(
                    national_id=national_id,
                    step=OPEN_STEP,
                    active_offer_code=offer.code,
                    required_documents=list(offer.required_documents),
                )
            else:
                candidate.step = OPEN_STEP
                candidate.active_offer_code = offer.code
                candidate.required_documents = merge_required_documents(candidate, offer.required_documents)
                candidate.documents_complete = False
                candidate.rejection_reason = None
            candidate.first_name = first_name
            candidate.last_name = last_name
            candidate.second_last_name = second_last_name
            candidate.email = email
            candidate.phone = phone
            candidate.updated_at = datetime.utcnow()
            await candidate.save()
        return status, token, user
