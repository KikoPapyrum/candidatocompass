"""Public offer page and local inscription."""

from fastapi import APIRouter, status

from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.offer import EnrollRequest
from app.services.document_service import DOCUMENT_LABELS
from app.services.enrollment_service import EnrollmentService, load_offer

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        national_id=user.national_id,
        email=user.email,
        email_verified=user.email_verified,
    )


@router.get("/{code}")
async def get_offer(code: str) -> dict:
    """Return the cached offer and the documents Kulteo marked as required."""
    offer = await load_offer(code)
    return {
        "code": offer.code,
        "title": offer.title,
        "description": offer.description,
        "open": offer.open,
        "documents": [
            {"code": document, "label": DOCUMENT_LABELS.get(document, document)}
            for document in offer.required_documents
        ],
    }


@router.post("/{code}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll(code: str, payload: EnrollRequest) -> dict:
    """Inscribe the candidate locally and open or confirm the account."""
    offer = await load_offer(code)
    next_step, token, user = await EnrollmentService.enroll(offer, payload)
    body = {
        "status": next_step,
        "detail": (
            "Código de verificación generado. Consúltalo en la consola del servidor."
            if next_step == "verify"
            else "Inscripción completada."
        ),
        "user": _user_response(user).model_dump(),
    }
    if token:
        body["access_token"] = token
        body["token_type"] = "bearer"
    return body
