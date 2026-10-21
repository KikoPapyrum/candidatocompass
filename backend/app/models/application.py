"""Local enrollment of a candidate in one offer."""

from datetime import datetime

import pymongo
from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class Application(Document):
    """One row per national id and offer. Kulteo APP_APPLICATIONS is not written yet."""

    national_id: str
    offer_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "applications"
        indexes = [
            IndexModel(
                [("national_id", pymongo.ASCENDING), ("offer_code", pymongo.ASCENDING)],
                unique=True,
            ),
        ]
