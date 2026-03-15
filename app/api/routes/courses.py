from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.models.schemas import (
    CourseCreateRequest,
    CoursePlanApprovalRequest,
    ExamRequest,
    GenericMessageResponse,
    QuizSubmitRequest,
)
from app.services.course_service import CourseService
from app.services.exam_service import ExamService
from app.services.lesson_service import LessonService
from app.services.progress_service import ProgressService
from app.services.quiz_service import QuizService


router = APIRouter()


@router.post("", response_model=GenericMessageResponse)
async def create_course(payload: CourseCreateRequest, db: AsyncSession = Depends(get_db_session)):
    result = await CourseService(db).create_course(payload)
    return GenericMessageResponse(message="Course generation started", data=result)


@router.post("/approve", response_model=GenericMessageResponse)
async def approve_course(payload: CoursePlanApprovalRequest, db: AsyncSession = Depends(get_db_session)):
    result = await CourseService(db).approve_course(payload)
    return GenericMessageResponse(message="Course approval processed", data=result)


@router.get("/{lesson_id}/lesson", response_model=GenericMessageResponse)
async def get_lesson(
    lesson_id: str,
    topic: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    course_plan_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
):
    result = await LessonService(db).get_lesson(
        lesson_id=lesson_id,
        topic=topic,
        user_id=user_id,
        course_plan_id=course_plan_id,
    )
    return GenericMessageResponse(message="Lesson fetched", data=result)


@router.post("/quiz/submit", response_model=GenericMessageResponse)
async def submit_quiz(payload: QuizSubmitRequest, db: AsyncSession = Depends(get_db_session)):
    result = await QuizService(db).submit_quiz(payload)
    return GenericMessageResponse(message="Quiz submitted", data=result)


@router.get("/{course_plan_id}/progress/{user_id}", response_model=GenericMessageResponse)
async def get_progress(
    course_plan_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    result = await ProgressService(db).get_progress(user_id=user_id, course_plan_id=course_plan_id)
    return GenericMessageResponse(message="Progress fetched", data=result)


@router.post("/exam", response_model=GenericMessageResponse)
async def take_exam(payload: ExamRequest, db: AsyncSession = Depends(get_db_session)):
    result = await ExamService(db).take_exam(payload)
    return GenericMessageResponse(message="Exam processed", data=result)


@router.get("/{course_plan_id}/certificate/{user_id}", response_model=GenericMessageResponse)
async def get_certificate(
    course_plan_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    result = await ExamService(db).get_certificate(user_id=user_id, course_plan_id=course_plan_id)
    return GenericMessageResponse(message="Certificate fetched", data=result)
