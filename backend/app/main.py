"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.database import connect, disconnect
from app.routers import auth, candidates, inbound
from app.utils.catalogs import load_catalogs
from app.utils.exceptions import DomainError


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Connect to MongoDB while the process is running."""
    await connect()
    yield
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
