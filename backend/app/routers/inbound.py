"""Inbound candidate API. Kulteo calls it the same way it calls the simulator."""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import settings
from app.models.candidate import Candidate
from app.services.inbound_service import InboundService
from app.utils.exceptions import DomainError
from app.utils.validators import normalize_national_id

router = APIRouter(prefix="/api", tags=["kulteo-inbound"])


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-Api-Key")) -> None:
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Api-Key",
        )


def _public(candidate: Candidate) -> dict:
    return {
        "identity_card_number": candidate.national_id,
        "id_object": candidate.object_id or None,
        "requested_document_classes": candidate.required_documents,
        "first_name": candidate.first_name,
        "email": candidate.email,
        "step": candidate.step,
    }


@router.post("/candidates", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
async def create_candidate(payload: dict) -> dict:
    candidate = await InboundService.upsert(payload)
    return _public(candidate)


@router.put("/candidates/{national_id}", dependencies=[Depends(require_api_key)])
async def update_candidate(national_id: str, payload: dict) -> dict:
    existing = await Candidate.find_one(Candidate.national_id == normalize_national_id(national_id))
    if existing is None:
        raise DomainError("Candidate not found", status_code=404)
    candidate = await InboundService.upsert(payload, national_id=national_id)
    return _public(candidate)


@router.get("/candidates/{national_id}", dependencies=[Depends(require_api_key)])
async def get_candidate(national_id: str) -> dict:
    candidate = await Candidate.find_one(Candidate.national_id == normalize_national_id(national_id))
    if candidate is None:
        raise DomainError("Candidate not found", status_code=404)
    return _public(candidate)


@router.delete("/candidates/{national_id}", dependencies=[Depends(require_api_key)])
async def delete_candidate(national_id: str) -> dict:
    deleted = await InboundService.delete(national_id)
    if not deleted:
        raise DomainError("Candidate not found", status_code=404)
    return {"deleted": normalize_national_id(national_id)}
