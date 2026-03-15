from __future__ import annotations

import asyncio
from contextlib import AsyncExitStack
from app.core.config import get_settings


_exit_stack = AsyncExitStack()
_checkpointer = None
_lock = asyncio.Lock()


async def get_checkpointer():
    global _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    async with _lock:
        if _checkpointer is not None:
            return _checkpointer

    settings = get_settings()
    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from langgraph.checkpoint.memory import InMemorySaver
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Postgres checkpointer dependency missing. Install langgraph-checkpoint-postgres."
        ) from exc

    try:
        saver = await _exit_stack.enter_async_context(
            AsyncPostgresSaver.from_conn_string(settings.checkpointer_db_uri)
        )
        try:
            await saver.setup()
        except Exception:
            # setup may fail during startup if DB is unavailable; graph can retry later.
            pass
        _checkpointer = saver
    except Exception:
        # Windows Proactor loop + psycopg async can fail; fallback keeps API functional.
        _checkpointer = InMemorySaver()

    return _checkpointer
