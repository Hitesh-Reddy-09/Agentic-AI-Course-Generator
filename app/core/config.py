from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="AI Course Generator API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")
    secret_key: str = Field(default="dev-secret-change-me", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    postgres_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ai_course_gen",
        alias="POSTGRES_URL",
    )
    checkpointer_db_uri: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/ai_course_gen",
        alias="CHECKPOINTER_DB_URI",
    )

    chroma_persist_directory: str = Field(default="./.chroma", alias="CHROMA_PERSIST_DIRECTORY")
    chroma_collection_prefix: str = Field(default="ai-course", alias="CHROMA_COLLECTION_PREFIX")
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        alias="EMBEDDING_MODEL",
    )

    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-70b-versatile", alias="GROQ_MODEL")

    youtube_api_key: str = Field(default="", alias="YOUTUBE_API_KEY")
    max_youtube_results: int = Field(default=3, alias="MAX_YOUTUBE_RESULTS")
    youtube_api_enabled: bool = Field(default=True, alias="YOUTUBE_API_ENABLED")
    youtube_max_calls_per_process: int = Field(default=20, alias="YOUTUBE_MAX_CALLS_PER_PROCESS")

    transcript_fallback_enabled: bool = Field(default=True, alias="TRANSCRIPT_FALLBACK_ENABLED")
    enable_certificate_pdf: bool = Field(default=False, alias="ENABLE_CERTIFICATE_PDF")


@lru_cache
def get_settings() -> Settings:
    return Settings()
