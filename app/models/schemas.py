from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class CourseCreateRequest(BaseModel):
    user_id: str
    query: str


class CoursePlanApprovalRequest(BaseModel):
    course_plan_id: str
    approved: bool
    user_edits: dict[str, Any] | None = None


class LessonResponse(BaseModel):
    lesson_id: str
    title: str
    topics: list[str]
    difficulty: str
    best_video_url: str | None = None
    summary: str | None = None
    key_points: list[str] = Field(default_factory=list)


class QuizSubmitRequest(BaseModel):
    user_id: str
    quiz_id: str
    course_plan_id: str | None = None
    answers: list[dict[str, Any]]


class DoubtRequest(BaseModel):
    user_id: str
    course_plan_id: str
    question: str


class TutorChatRequest(BaseModel):
    user_id: str
    course_plan_id: str
    message: str


class ProgressResponse(BaseModel):
    user_id: str
    course_plan_id: str
    lessons_completed: int
    average_quiz_score: float
    weak_topics: list[str]
    attempts_count: int
    time_spent_minutes: int


class ExamRequest(BaseModel):
    user_id: str
    course_plan_id: str
    answers: list[dict[str, Any]] | None = None


class CertificateResponse(BaseModel):
    certificate_id: str
    user_id: str
    course_plan_id: str
    final_score: float
    level: str
    issued_at: datetime


class GenericMessageResponse(BaseModel):
    message: str
    data: dict[str, Any] | None = None


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str
