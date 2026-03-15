import asyncio
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import get_settings


if sys.platform.startswith("win"):
    # Psycopg async is incompatible with ProactorEventLoop on Windows.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Place startup hooks here (migrations, clients, warmup).
    yield
    # Place shutdown hooks here (flush queues, close external clients).


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}
