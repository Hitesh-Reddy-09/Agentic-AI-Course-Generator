from sqlalchemy import create_engine
from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401


def init_db() -> None:
    settings = get_settings()
    sync_url = settings.postgres_url.replace("+asyncpg", "+psycopg")
    engine = create_engine(sync_url, future=True)
    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
    engine.dispose()


if __name__ == "__main__":
    init_db()
