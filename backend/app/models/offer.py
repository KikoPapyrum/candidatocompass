"""Job offer cached from Kulteo."""

from datetime import datetime

import pymongo
from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class JobOffer(Document):
    """Public offer shown at /oferta/{code}, refreshed from Kulteo."""

    code: str
    kulteo_item_id: str = ""
    title: str
    description: str = ""
    open: bool = True
    required_documents: list[str] = Field(default_factory=list)
    synced_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "offers"
        indexes = [
            IndexModel([("code", pymongo.ASCENDING)], unique=True),
        ]
