"""Insert a sample candidate so local login can be tested.

The registration flow never creates this record. An external process does,
and this script stands in for that process on a local database.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import connect, disconnect
from app.models.candidate import Candidate


SAMPLE_NATIONAL_ID = "12345678Z"


async def seed() -> None:
    await connect()
    existing = await Candidate.find_one(Candidate.national_id == SAMPLE_NATIONAL_ID)
    if existing is None:
        await Candidate(
            national_id=SAMPLE_NATIONAL_ID,
            object_id="obj-12345678Z",
            first_name="Ana",
            last_name="García",
            second_last_name="López",
            step="Callback - Pendiente Candidato",
            required_documents=["DNI_ANVERSO", "DNI_REVERSO", "CV"],
        ).insert()
        print(f"Candidato de ejemplo creado: {SAMPLE_NATIONAL_ID}")
    else:
        print(f"El candidato {SAMPLE_NATIONAL_ID} ya existe.")
    await disconnect()


if __name__ == "__main__":
    asyncio.run(seed())
