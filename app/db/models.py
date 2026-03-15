from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    level: Mapped[str | None] = mapped_column(String(50))
    learning_goal: Mapped[str | None] = mapped_column(Text)

    course_plans: Mapped[list[CoursePlan]] = relationship(back_populates="user")


class CoursePlan(Base, TimestampMixin):
    __tablename__ = "course_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(50), nullable=False)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_duration: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="draft")
    plan_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    user: Mapped[User] = relationship(back_populates="course_plans")
    modules: Mapped[list[CourseModule]] = relationship(back_populates="course_plan")


class CourseModule(Base, TimestampMixin):
    __tablename__ = "course_modules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    course_plan: Mapped[CoursePlan] = relationship(back_populates="modules")
    lessons: Mapped[list[Lesson]] = relationship(back_populates="module")


class Lesson(Base, TimestampMixin):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("course_modules.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topics: Mapped[list[str]] = mapped_column(JSON, default=list)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    best_video_url: Mapped[str | None] = mapped_column(Text)

    module: Mapped[CourseModule] = relationship(back_populates="lessons")
    transcript: Mapped[Transcript | None] = relationship(back_populates="lesson", uselist=False)
    notes: Mapped[LessonNote | None] = relationship(back_populates="lesson", uselist=False)
    quizzes: Mapped[list[Quiz]] = relationship(back_populates="lesson")


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), unique=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    lesson: Mapped[Lesson] = relationship(back_populates="transcript")


class LessonNote(Base, TimestampMixin):
    __tablename__ = "lesson_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), unique=True)
    short_summary: Mapped[str] = mapped_column(Text, nullable=False)
    detailed_notes: Mapped[str] = mapped_column(Text, nullable=False)
    key_points: Mapped[list[str]] = mapped_column(JSON, default=list)

    lesson: Mapped[Lesson] = relationship(back_populates="notes")


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    questions_json: Mapped[list[dict]] = mapped_column(JSON, default=list)

    lesson: Mapped[Lesson] = relationship(back_populates="quizzes")
    attempts: Mapped[list[QuizAttempt]] = relationship(back_populates="quiz")


class QuizAttempt(Base, TimestampMixin):
    __tablename__ = "quiz_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers_json: Mapped[list[dict]] = mapped_column(JSON, default=list)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)

    quiz: Mapped[Quiz] = relationship(back_populates="attempts")


class Progress(Base, TimestampMixin):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "course_plan_id", name="uq_user_course_progress"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    lessons_completed: Mapped[int] = mapped_column(Integer, default=0)
    average_quiz_score: Mapped[float] = mapped_column(Float, default=0.0)
    weak_topics: Mapped[list[str]] = mapped_column(JSON, default=list)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    time_spent_minutes: Mapped[int] = mapped_column(Integer, default=0)


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    questions_json: Mapped[list[dict]] = mapped_column(JSON, default=list)


class ExamAttempt(Base, TimestampMixin):
    __tablename__ = "exam_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers_json: Mapped[list[dict]] = mapped_column(JSON, default=list)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)


class Certificate(Base, TimestampMixin):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("course_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    level: Mapped[str] = mapped_column(String(50), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ConversationMemory(Base, TimestampMixin):
    __tablename__ = "conversation_memory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)


class AgentRun(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    node_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    input_json: Mapped[dict] = mapped_column(JSON, default=dict)
    output_json: Mapped[dict] = mapped_column(JSON, default=dict)
