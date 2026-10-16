"""Application settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from the environment and an optional `.env` file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Candidato Compass"
    debug: bool = True
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "candidato_compass"
    secret_key: str = "local-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173"
    storage_dir: str = "./storage"
    api_key: str = "changeme"
    kulteo_base_url: str = ""
    kulteo_api_key: str = ""
    kulteo_tenant: str = "compass"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
