from fastapi import APIRouter
from app.api.routes import auth, courses, tutor


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
