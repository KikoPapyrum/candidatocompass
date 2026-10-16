"""Account used to sign in. The candidate record is created separately."""

from datetime import datetime
from typing import Optional

import pymongo
from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class User(Document):
    """Login account keyed by DNI or NIE."""

    national_id: str
    email: str
    hashed_password: str
    email_verified: bool = False
    verification_code: Optional[str] = None
    verification_purpose: Optional[str] = None
    verification_expires_at: Optional[datetime] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("national_id", pymongo.ASCENDING)], unique=True),
        ]
