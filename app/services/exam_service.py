from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Certificate, CoursePlan, Exam, ExamAttempt
from app.graph.supervisor import run_graph
from app.models.schemas import ExamRequest
from app.utils.ids import to_uuid


class ExamService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def take_exam(self, payload: ExamRequest) -> dict:
        state = await run_graph(
            {
                "intent": "take_exam",
                "user_id": payload.user_id,
                "course_plan_id": payload.course_plan_id,
                "answers": payload.answers or [],
                "messages": [],
            }
        )

        course_plan_id = to_uuid(payload.course_plan_id)
        user_id = to_uuid(payload.user_id)
        exam_result = state.get("exam_result") or {}

        exam_stmt = select(Exam).where(Exam.course_plan_id == course_plan_id)
        exam = (await self.db.execute(exam_stmt)).scalar_one_or_none()
        if exam is None:
            exam = Exam(course_plan_id=course_plan_id, questions_json=(state.get("exam") or {}).get("questions", []))
            self.db.add(exam)
            await self.db.flush()

        if payload.answers:
            attempt = ExamAttempt(
                exam_id=exam.id,
                user_id=user_id,
                answers_json=payload.answers,
                score=float(exam_result.get("score", 0.0)),
                passed=bool(exam_result.get("passed", False)),
            )
            self.db.add(attempt)

            if attempt.passed:
                plan = await self.db.get(CoursePlan, course_plan_id)
                certificate = Certificate(
                    user_id=user_id,
                    course_plan_id=course_plan_id,
                    final_score=attempt.score,
                    level=plan.level if plan else "beginner",
                )
                self.db.add(certificate)

        await self.db.commit()
        return state

    async def get_certificate(self, user_id: str, course_plan_id: str) -> dict:
        stmt = (
            select(Certificate)
            .where(
                Certificate.user_id == to_uuid(user_id),
                Certificate.course_plan_id == to_uuid(course_plan_id),
            )
            .order_by(Certificate.created_at.desc())
        )
        cert = (await self.db.execute(stmt)).scalars().first()
        if cert:
            return {
                "certificate_id": str(cert.id),
                "user_id": str(cert.user_id),
                "course_plan_id": str(cert.course_plan_id),
                "final_score": cert.final_score,
                "level": cert.level,
                "issued_at": cert.issued_at.isoformat(),
            }

        return {
            "certificate_id": None,
            "message": "No certificate found. Complete and pass the final exam first.",
        }
