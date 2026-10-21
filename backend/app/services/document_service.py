"""Store required files on disk and their metadata in MongoDB."""

import logging
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.models.candidate import Candidate
from app.models.document import CandidateDocument
from app.schemas.candidate import DocumentStatus
from app.services.candidate_service import ensure_editable
from app.utils.exceptions import DomainError

DOCUMENT_LABELS = {
    "DNI_ANVERSO": "DNI/NIE anverso",
    "DNI_REVERSO": "DNI/NIE reverso",
    "PASAPORTE_ORIGEN_ANVERSO": "Pasaporte o DNI de origen anverso",
    "PASAPORTE_ORIGEN_REVERSO": "Pasaporte o DNI de origen reverso",
    "CV": "CV",
    "TITULO": "Título académico",
    "CARNE_ANVERSO": "Carné anverso",
    "CARNE_REVERSO": "Carné reverso",
    "DARDE": "DARDE",
    "CERTIFICADO_MINUSVALIA": "Certificado de minusvalía",
    "CERTIFICADO_EXCLUSION_SOCIAL": "Certificado de exclusión social",
    "CERTIFICADO_VIOLENCIA_GENERO": "Certificado de violencia de género",
    "CERTIFICADO_DELITOS_SEXUALES": "Certificado de delitos sexuales",
    "CERTIFICADO_DELITOS_SEXUALES_EXTRANJERO": "Certificado de delitos sexuales en el extranjero",
}
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}
MAX_BYTES = 20 * 1024 * 1024
THUMB_EDGE = 640
PREVIEW_EDGE = 1200
PREVIEW_PAGE_LIMIT = 20
logger = logging.getLogger(__name__)


class DocumentService:
    """Upload and list the files Compass requested for this candidate."""

    @staticmethod
    async def list_status(candidate: Candidate) -> list[DocumentStatus]:
        stored = {
            item.document_type: item
            for item in await CandidateDocument.find(
                CandidateDocument.national_id == candidate.national_id
            ).to_list()
        }
        return [
            DocumentStatus(
                document_type=document_type,
                label=DOCUMENT_LABELS.get(document_type, document_type),
                required=True,
                uploaded=document_type in stored,
                original_filename=stored[document_type].original_filename if document_type in stored else None,
                uploaded_at=stored[document_type].uploaded_at.isoformat() if document_type in stored else None,
            )
            for document_type in candidate.required_documents
        ]

    @staticmethod
    async def save_upload(candidate: Candidate, document_type: str, upload: UploadFile) -> CandidateDocument:
        ensure_editable(candidate)
        if document_type not in candidate.required_documents or document_type not in DOCUMENT_LABELS:
            raise DomainError("Ese documento no está solicitado.")
        content_type = upload.content_type or ""
        if content_type not in ALLOWED_TYPES:
            raise DomainError("El formato debe ser jpg, png o pdf.")
        payload = await upload.read()
        if not payload:
            raise DomainError("El fichero está vacío.")
        if len(payload) > MAX_BYTES:
            raise DomainError("El fichero supera 20 MB. Si es una foto, baja la resolución.")

        folder = Path(settings.storage_dir) / candidate.national_id
        folder.mkdir(parents=True, exist_ok=True)
        stored_name = f"{document_type}{ALLOWED_TYPES[content_type]}"
        destination = folder / stored_name
        destination.write_bytes(payload)
        _write_thumbnail(destination, content_type, _thumbnail_path(folder, document_type))

        existing = await CandidateDocument.find_one(
            CandidateDocument.national_id == candidate.national_id,
            CandidateDocument.document_type == document_type,
        )
        if existing and existing.stored_name != stored_name:
            old_path = folder / existing.stored_name
            if old_path.exists():
                old_path.unlink()
        if existing is None:
            existing = CandidateDocument(
                national_id=candidate.national_id,
                document_type=document_type,
                original_filename=upload.filename or stored_name,
                content_type=content_type,
                stored_name=stored_name,
                size=len(payload),
            )
            await existing.insert()
        else:
            existing.original_filename = upload.filename or stored_name
            existing.content_type = content_type
            existing.stored_name = stored_name
            existing.size = len(payload)
            existing.uploaded_at = datetime.utcnow()
            await existing.save()
        return existing

    @staticmethod
    async def mark_complete(candidate: Candidate) -> Candidate:
        ensure_editable(candidate)
        if not candidate.personal_data_complete:
            raise DomainError("Guarda primero los datos personales.")
        uploaded = {
            item.document_type
            for item in await CandidateDocument.find(
                CandidateDocument.national_id == candidate.national_id
            ).to_list()
        }
        missing = [item for item in candidate.required_documents if item not in uploaded]
        if missing:
            raise DomainError("Faltan documentos por subir.")
        candidate.documents_complete = True
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        return candidate

    @staticmethod
    def file_path(candidate: Candidate, document: CandidateDocument) -> Path:
        return Path(settings.storage_dir) / candidate.national_id / document.stored_name

    @staticmethod
    def ensure_thumbnail(candidate: Candidate, document: CandidateDocument) -> Path:
        """Return the small JPEG preview, creating it from the stored file when missing."""
        folder = Path(settings.storage_dir) / candidate.national_id
        thumb = _thumbnail_path(folder, document.document_type)
        source = DocumentService.file_path(candidate, document)
        if not thumb.exists():
            _write_thumbnail(source, document.content_type, thumb)
        if not thumb.exists():
            raise DomainError("No se ha podido crear la miniatura.", status_code=404)
        return thumb


def _thumbnail_path(folder: Path, document_type: str) -> Path:
    return folder / f"{document_type}.thumb.jpg"


def _write_thumbnail(source: Path, content_type: str, destination: Path) -> None:
    """Best-effort preview. A failure leaves the original upload in place."""
    try:
        if content_type == "application/pdf":
            _pdf_thumbnail(source, destination)
        else:
            _image_thumbnail(source, destination)
    except Exception:
        logger.exception("Could not build a thumbnail for %s", source)
        if destination.exists():
            destination.unlink()


def _image_thumbnail(source: Path, destination: Path) -> None:
    from PIL import Image

    with Image.open(source) as image:
        preview = image.convert("RGB")
        preview.thumbnail((THUMB_EDGE, THUMB_EDGE))
        preview.save(destination, "JPEG", quality=75, optimize=True)


def render_pdf_preview(source: Path) -> bytes:
    """Flatten a PDF into one JPEG so the app can show it without the browser viewer."""
    import io

    import fitz
    from PIL import Image

    pages: list[Image.Image] = []
    with fitz.open(source) as document:
        if document.page_count == 0:
            raise DomainError("El PDF no tiene páginas.", status_code=422)
        count = min(document.page_count, PREVIEW_PAGE_LIMIT)
        for index in range(count):
            page = document[index]
            scale = min(PREVIEW_EDGE / (page.rect.width or 1), 2)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("jpeg"))).convert("RGB")
            pages.append(image)
    gap = 16
    sheet_width = max(page.width for page in pages)
    sheet_height = sum(page.height for page in pages) + gap * (len(pages) - 1)
    sheet = Image.new("RGB", (sheet_width, sheet_height), (243, 245, 248))
    top = 0
    for page in pages:
        sheet.paste(page, ((sheet_width - page.width) // 2, top))
        top += page.height + gap
        page.close()
    buffer = io.BytesIO()
    sheet.save(buffer, "JPEG", quality=82, optimize=True)
    return buffer.getvalue()


def _pdf_thumbnail(source: Path, destination: Path) -> None:
    import fitz

    with fitz.open(source) as document:
        page = document[0]
        width = page.rect.width or 1
        height = page.rect.height or 1
        scale = min(THUMB_EDGE / width, THUMB_EDGE / height, 2)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        pixmap.save(destination.as_posix())
