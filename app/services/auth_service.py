from __future__ import annotations

import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.models.schemas import LoginRequest, RegisterRequest


AUTH_PASSWORD_KEY = "auth_password_hash"


def _extract_auth_data(user: User) -> dict:
    raw = user.learning_goal or ""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, payload: RegisterRequest) -> dict:
        stmt = select(User).where(User.email == payload.email)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ValueError("Email already registered")

        user = User(
            name=payload.name,
            email=payload.email,
            level="beginner",
            learning_goal=json.dumps({AUTH_PASSWORD_KEY: hash_password(payload.password)}),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        token = create_access_token(user_id=str(user.id), email=user.email or "")
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
        }

    async def login(self, payload: LoginRequest) -> dict:
        stmt = select(User).where(User.email == payload.email)
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        if user is None:
            raise ValueError("Invalid email or password")

        auth_data = _extract_auth_data(user)
        password_hash = auth_data.get(AUTH_PASSWORD_KEY)
        if not password_hash or not verify_password(payload.password, password_hash):
            raise ValueError("Invalid email or password")

        token = create_access_token(user_id=str(user.id), email=user.email or "")
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
        }
