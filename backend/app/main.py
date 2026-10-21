"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.database import connect, disconnect
from app.routers import auth, candidates, inbound, offers
from app.services.offer_sync import offer_sync_loop
from app.utils.catalogs import load_catalogs
from app.utils.exceptions import DomainError


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Connect to MongoDB and refresh the offer cache while the process is running."""
    await connect()
    sync_task = asyncio.create_task(offer_sync_loop(settings.offer_sync_seconds))
    yield
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass
    await disconnect()


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
app.include_router(inbound.router)
app.include_router(offers.router, prefix="/offers", tags=["offers"])


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    """Turn a business-rule failure into a JSON error."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health")
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/catalogs")
async def catalogs() -> dict:
    """Nationality, country and province lists for the forms."""
    return load_catalogs()
