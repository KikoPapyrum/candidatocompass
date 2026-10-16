"""Uploaded file metadata. The bytes live on disk."""

from datetime import datetime

import pymongo
from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class CandidateDocument(Document):
    """One required file for a candidate."""

    national_id: str
    document_type: str
    original_filename: str
    content_type: str
    stored_name: str
    size: int
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "documents"
        indexes = [
            IndexModel(
                [
                    ("national_id", pymongo.ASCENDING),
                    ("document_type", pymongo.ASCENDING),
                ],
                unique=True,
            ),
        ]
