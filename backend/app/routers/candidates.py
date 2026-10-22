"""Candidate file and document routes."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, Response

from app.dependencies import get_current_candidate
from app.models.candidate import Candidate
from app.models.document import CandidateDocument
from app.schemas.candidate import DocumentStatus, LegalSubmit, PersonalDataUpdate, TaxDataUpdate
from app.services.candidate_service import EDITABLE_STEPS, CandidateService
from app.services.document_service import DocumentService, render_pdf_preview
from app.services.kulteo_submit import KulteoSubmitService
from app.utils.exceptions import DomainError

router = APIRouter()


def _candidate_payload(candidate: Candidate) -> dict:
    payload = candidate.model_dump(mode="json")
    payload["id"] = str(candidate.id)
    payload.pop("revision_id", None)
    payload["editable"] = candidate.step in EDITABLE_STEPS or bool(candidate.step_warnings)
    return payload


@router.get("/me")
async def get_me(candidate: Candidate = Depends(get_current_candidate)) -> dict:
    """Return the hiring file of the signed-in candidate."""
    return _candidate_payload(candidate)


@router.patch("/me/personal")
async def save_personal(
    payload: PersonalDataUpdate,
    candidate: Candidate = Depends(get_current_candidate),
) -> dict:
    """Save personal data and open the document step."""
    saved = await CandidateService.save_personal(candidate, payload)
    return _candidate_payload(saved)


@router.patch("/me/tax")
async def save_tax(
    payload: TaxDataUpdate,
    candidate: Candidate = Depends(get_current_candidate),
) -> dict:
    """Save form 145."""
    saved = await CandidateService.save_tax(candidate, payload)
    return _candidate_payload(saved)


@router.post("/me/submit")
async def submit(
    payload: LegalSubmit,
    candidate: Candidate = Depends(get_current_candidate),
) -> dict:
    """Accept the legal clauses, create the documents in Kulteo and close the file."""
    await KulteoSubmitService.submit(candidate)
    saved = await CandidateService.submit(
        candidate,
        payload.privacy_accepted,
        payload.email_accepted,
        payload.truth_accepted,
    )
    return _candidate_payload(saved)


@router.get("/me/documents", response_model=list[DocumentStatus])
async def list_documents(candidate: Candidate = Depends(get_current_candidate)) -> list[DocumentStatus]:
    """List the documents Compass requested and whether each one is uploaded."""
    return await DocumentService.list_status(candidate)


@router.post("/me/documents")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    candidate: Candidate = Depends(get_current_candidate),
) -> DocumentStatus:
    """Store one required file."""
    await DocumentService.save_upload(candidate, document_type, file)
    statuses = await DocumentService.list_status(candidate)
    for status in statuses:
        if status.document_type == document_type:
            return status
    raise DomainError("No se ha podido confirmar la subida.")


@router.post("/me/documents/complete")
async def complete_documents(candidate: Candidate = Depends(get_current_candidate)) -> dict:
    """Mark the document step done when every requested file is stored."""
    saved = await DocumentService.mark_complete(candidate)
    return _candidate_payload(saved)


@router.get("/me/documents/{document_type}/thumbnail")
async def document_thumbnail(
    document_type: str,
    candidate: Candidate = Depends(get_current_candidate),
) -> FileResponse:
    """Return the small preview generated for one uploaded file."""
    document = await CandidateDocument.find_one(
        CandidateDocument.national_id == candidate.national_id,
        CandidateDocument.document_type == document_type,
    )
    if document is None:
        raise DomainError("El documento no está subido.", status_code=404)
    path = DocumentService.ensure_thumbnail(candidate, document)
    return FileResponse(path, media_type="image/jpeg")


@router.get("/me/documents/{document_type}/preview")
async def document_preview(
    document_type: str,
    candidate: Candidate = Depends(get_current_candidate),
) -> Response:
    """Return a viewable image. PDFs are rendered here because the browser viewer stays blank in the dialog."""
    document = await CandidateDocument.find_one(
        CandidateDocument.national_id == candidate.national_id,
        CandidateDocument.document_type == document_type,
    )
    if document is None:
        raise DomainError("El documento no está subido.", status_code=404)
    path = DocumentService.file_path(candidate, document)
    if not path.exists():
        raise DomainError("El fichero no está en el almacenamiento.", status_code=404)
    if document.content_type == "application/pdf":
        return Response(content=render_pdf_preview(path), media_type="image/jpeg")
    return FileResponse(path, media_type=document.content_type)


@router.get("/me/documents/{document_type}")
async def download_document(
    document_type: str,
    candidate: Candidate = Depends(get_current_candidate),
) -> FileResponse:
    """Download a file the candidate already uploaded."""
    document = await CandidateDocument.find_one(
        CandidateDocument.national_id == candidate.national_id,
        CandidateDocument.document_type == document_type,
    )
    if document is None:
        raise DomainError("El documento no está subido.", status_code=404)
    path = DocumentService.file_path(candidate, document)
    if not path.exists():
        raise DomainError("El fichero no está en el almacenamiento.", status_code=404)
    return FileResponse(path, media_type=document.content_type, filename=document.original_filename)
