from __future__ import annotations

import uuid
from sqlalchemy.exc import SQLAlchemyError
from app.db.models import ConversationMemory, User
from app.db.session import SessionLocal


class MemoryStore:
    async def save_message(self, user_id: str, session_id: str, role: str, content: str) -> None:
        try:
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            # Ignore memory persistence for non-UUID user identifiers.
            return

        async with SessionLocal() as db:
            try:
                user = await db.get(User, user_uuid)
                if user is None:
                    user = User(id=user_uuid, name=f"Learner-{str(user_uuid)[:8]}")
                    db.add(user)
                    # Ensure parent row exists before child FK insert.
                    await db.flush()

                row = ConversationMemory(
                    user_id=user_uuid,
                    session_id=session_id,
                    role=role,
                    content=content,
                )
                db.add(row)
                await db.commit()
            except SQLAlchemyError:
                await db.rollback()
                # Memory writes are best effort and should not break request flow.
                return


memory_store = MemoryStore()
