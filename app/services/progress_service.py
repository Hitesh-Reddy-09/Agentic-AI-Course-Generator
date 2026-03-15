from __future__ import annotations

import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import CoursePlan, Progress, Quiz, QuizAttempt
from app.utils.ids import to_uuid


class ProgressService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _parse_json_like(value):
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            cleaned = value.replace("```json", "").replace("```", "").strip()
            try:
                return json.loads(cleaned)
            except Exception:
                return {}
        return {}

    @classmethod
    def _extract_lesson_keys(cls, plan_json: dict) -> list[str]:
        payload = cls._parse_json_like(plan_json)
        raw_plan = cls._parse_json_like(payload.get("raw_plan"))
        root = raw_plan if raw_plan else payload

        modules = root.get("modules") if isinstance(root, dict) else []
        if not isinstance(modules, list):
            return []

        lesson_keys: list[str] = []
        for module_idx, module_item in enumerate(modules, start=1):
            if not isinstance(module_item, dict):
                continue
            lessons = module_item.get("lessons")
            if not isinstance(lessons, list):
                continue
            for lesson_idx, lesson_item in enumerate(lessons, start=1):
                if isinstance(lesson_item, dict):
                    lesson_id = lesson_item.get("lesson_id")
                    lesson_keys.append(str(lesson_id or f"{module_idx}.{lesson_idx}"))
                else:
                    lesson_keys.append(f"{module_idx}.{lesson_idx}")
        return lesson_keys

    async def recompute_progress(self, user_id: str, course_plan_id: str) -> dict:
        user_uuid = to_uuid(user_id)
        course_uuid = to_uuid(course_plan_id)

        plan = await self.db.get(CoursePlan, course_uuid)
        lesson_keys = self._extract_lesson_keys(plan.plan_json if plan else {})
        scoped_lesson_ids = [to_uuid(f"{course_plan_id}:{key}") for key in lesson_keys]

        quiz_ids: list = []
        quiz_lookup: dict = {}
        if scoped_lesson_ids:
            quiz_rows = (
                (
                    await self.db.execute(
                        select(Quiz).where(Quiz.lesson_id.in_(scoped_lesson_ids))
                    )
                )
                .scalars()
                .all()
            )
            quiz_ids = [quiz.id for quiz in quiz_rows]
            quiz_lookup = {quiz.id: quiz for quiz in quiz_rows}

        attempts: list[QuizAttempt] = []
        if quiz_ids:
            attempts = (
                (
                    await self.db.execute(
                        select(QuizAttempt)
                        .where(
                            QuizAttempt.user_id == user_uuid,
                            QuizAttempt.quiz_id.in_(quiz_ids),
                        )
                        .order_by(QuizAttempt.created_at.asc())
                    )
                )
                .scalars()
                .all()
            )

        attempts_count = len(attempts)
        avg_score = round(sum(float(a.score) for a in attempts) / attempts_count, 2) if attempts_count else 0.0

        passed_quiz_ids = {a.quiz_id for a in attempts if float(a.score) >= 70.0}
        lessons_completed = len(passed_quiz_ids)

        weak_topic_counter: dict[str, int] = {}
        for attempt in attempts:
            quiz = quiz_lookup.get(attempt.quiz_id)
            if not quiz:
                continue
            question_map = {
                str(q.get("question_id", "")): q
                for q in list(quiz.questions_json or [])
                if isinstance(q, dict)
            }
            for ans in list(attempt.answers_json or []):
                if not isinstance(ans, dict):
                    continue
                qid = str(ans.get("question_id", ""))
                selected = str(ans.get("answer", "")).strip().lower()
                q = question_map.get(qid) or {}
                expected = str(q.get("answer") or q.get("correct_answer") or "").strip().lower()
                if expected and selected and selected != expected:
                    label = str(q.get("question") or qid or "weak_topic")
                    weak_topic_counter[label] = weak_topic_counter.get(label, 0) + 1

        weak_topics = [topic for topic, _ in sorted(weak_topic_counter.items(), key=lambda item: item[1], reverse=True)[:5]]
        total_lessons = len(lesson_keys)

        quiz_scores = []
        if attempts:
            for idx, attempt in enumerate(attempts, start=1):
                quiz_scores.append({"lesson": f"Attempt {idx}", "score": float(attempt.score)})

        recommendations: list[str] = []
        if attempts_count == 0:
            recommendations.append("Start with lesson 1 and complete your first quiz.")
        if weak_topics:
            recommendations.append("Review weak topics before moving ahead.")
        if attempts_count > 0 and avg_score < 70:
            recommendations.append("Retake recent lesson quizzes to reach at least 70%.")
        if total_lessons > 0 and lessons_completed >= total_lessons:
            recommendations.append("Great work. You have completed all lesson quizzes.")

        stmt = select(Progress).where(
            Progress.user_id == user_uuid,
            Progress.course_plan_id == course_uuid,
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing is None:
            existing = Progress(
                user_id=user_uuid,
                course_plan_id=course_uuid,
                lessons_completed=lessons_completed,
                average_quiz_score=avg_score,
                weak_topics=weak_topics,
                attempts_count=attempts_count,
                time_spent_minutes=attempts_count * 25,
            )
            self.db.add(existing)
        else:
            existing.lessons_completed = lessons_completed
            existing.average_quiz_score = avg_score
            existing.weak_topics = weak_topics
            existing.attempts_count = attempts_count
            existing.time_spent_minutes = attempts_count * 25

        await self.db.commit()

        return {
            "lessons_completed": lessons_completed,
            "total_lessons": total_lessons,
            "average_quiz_score": avg_score,
            "weak_topics": weak_topics,
            "attempts_count": attempts_count,
            "time_spent_minutes": attempts_count * 25,
            "quiz_scores": quiz_scores,
            "recommendations": recommendations,
        }

    async def get_progress(self, user_id: str, course_plan_id: str) -> dict:
        return await self.recompute_progress(user_id=user_id, course_plan_id=course_plan_id)
