from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.models.schemas import GenericMessageResponse, LoginRequest, RegisterRequest
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=GenericMessageResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db_session)):
    try:
        result = await AuthService(db).register(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return GenericMessageResponse(message="Registration successful", data=result)


@router.post("/login", response_model=GenericMessageResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db_session)):
    try:
        result = await AuthService(db).login(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return GenericMessageResponse(message="Login successful", data=result)
