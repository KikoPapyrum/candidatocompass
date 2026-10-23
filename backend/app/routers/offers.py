"""Public offer page and local inscription."""

from fastapi import APIRouter, status

from app.schemas.offer import EnrollRequest
from app.services.captcha_service import CaptchaService
from app.services.document_service import DOCUMENT_LABELS
from app.services.enrollment_service import EnrollmentService, load_offer

router = APIRouter()


@router.get("/captcha")
async def captcha() -> dict:
    """Return a one-time image challenge for the public inscription."""
    challenge_id, image = CaptchaService.issue()
    return {"captcha_id": challenge_id, "image": image}


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
    """Save the request. The password is created later in the app."""
    offer = await load_offer(code)
    next_step = await EnrollmentService.enroll(offer, payload)
    detail = (
        "Solicitud guardada. Inicia la sesión con tu cuenta."
        if next_step == "login"
        else "Solicitud guardada. Regístrate en la aplicación para elegir la contraseña."
    )
    return {"status": next_step, "detail": detail}
