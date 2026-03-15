from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Quiz, QuizAttempt, User
from app.graph.supervisor import run_graph
from app.models.schemas import QuizSubmitRequest
from app.services.progress_service import ProgressService
from app.utils.ids import to_uuid


class QuizService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit_quiz(self, payload: QuizSubmitRequest) -> dict:
        user_id = to_uuid(payload.user_id)
        quiz_id = to_uuid(payload.quiz_id)

        user = await self.db.get(User, user_id)
        if user is None:
            user = User(id=user_id, name=f"Learner-{str(user_id)[:8]}")
            self.db.add(user)

        quiz = await self.db.get(Quiz, quiz_id)
        if quiz is None:
            await self.db.commit()
            return {
                "quiz_result": {
                    "score": 0.0,
                    "total": 0,
                    "correct": 0,
                    "passed": False,
                    "recommendation": "Quiz not found. Reload the lesson and retry.",
                    "weak_topics": [],
                },
                "warning": "Quiz id not found in database; result returned without persistence",
            }

        state = {
            "intent": "submit_quiz",
            "user_id": payload.user_id,
            "quiz_id": payload.quiz_id,
            "level": quiz.difficulty,
            "quiz": {
                "difficulty": quiz.difficulty,
                "questions": list(quiz.questions_json or []),
            },
            "answers": payload.answers,
            "messages": [],
        }
        graph_result = await run_graph(state)

        result = graph_result.get("quiz_result") or {}
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            user_id=user_id,
            answers_json=payload.answers,
            score=float(result.get("score", 0.0)),
            feedback=str(result.get("recommendation", "")),
        )
        self.db.add(attempt)
        await self.db.commit()

        progress_payload = None
        if payload.course_plan_id:
            progress_payload = await ProgressService(self.db).recompute_progress(
                user_id=payload.user_id,
                course_plan_id=payload.course_plan_id,
            )

        graph_result["attempt_id"] = str(attempt.id)
        graph_result["quiz_id"] = payload.quiz_id
        if progress_payload is not None:
            graph_result["progress"] = progress_payload
        return graph_result
