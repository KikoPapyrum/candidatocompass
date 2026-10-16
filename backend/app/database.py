"""MongoDB connection."""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings
from app.models.candidate import Candidate
from app.models.document import CandidateDocument
from app.models.user import User

client: AsyncIOMotorClient | None = None


async def connect() -> None:
    """Open MongoDB and register Beanie documents."""
    global client
    client = AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.mongodb_database],
        document_models=[User, Candidate, CandidateDocument],
    )


async def disconnect() -> None:
    """Close the MongoDB client."""
    if client is not None:
        client.close()
