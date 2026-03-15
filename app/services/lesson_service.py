from __future__ import annotations

import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.db.models import CourseModule, CoursePlan, Lesson, LessonNote, Quiz, Transcript, User
from app.graph.supervisor import run_graph
from app.rag.chroma_store import ChromaVectorStore
from app.utils.ids import to_uuid


SYSTEM_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SYSTEM_PLAN_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
SYSTEM_MODULE_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")


class LessonService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_default_module(self) -> uuid.UUID:
        user = await self.db.get(User, SYSTEM_USER_ID)
        if user is None:
            user = User(id=SYSTEM_USER_ID, name="System User")
            self.db.add(user)

        plan = await self.db.get(CoursePlan, SYSTEM_PLAN_ID)
        if plan is None:
            plan = CoursePlan(
                id=SYSTEM_PLAN_ID,
                user_id=SYSTEM_USER_ID,
                query="System lesson container",
                title="System Course Plan",
                level="beginner",
                goal="Store standalone lesson pipeline outputs",
                preferred_duration="self-paced",
                status="approved",
                plan_json={"modules": []},
            )
            self.db.add(plan)

        module = await self.db.get(CourseModule, SYSTEM_MODULE_ID)
        if module is None:
            module = CourseModule(
                id=SYSTEM_MODULE_ID,
                course_plan_id=SYSTEM_PLAN_ID,
                title="System Module",
                description="Auto-created container for lesson endpoint smoke and standalone runs",
                order_index=0,
            )
            self.db.add(module)

        await self.db.flush()
        return SYSTEM_MODULE_ID

    async def get_lesson(
        self,
        lesson_id: str,
        topic: str | None = None,
        user_id: str | None = None,
        course_plan_id: str | None = None,
    ) -> dict:
        search_query = (topic or "").strip() or f"{lesson_id} tutorial"
        state = await run_graph(
            {
                "intent": "get_lesson",
                "lesson_id": lesson_id,
                "query": search_query,
                "user_id": user_id,
                "course_plan_id": course_plan_id,
                "messages": [],
            }
        )

        scoped_lesson_key = f"{course_plan_id}:{lesson_id}" if course_plan_id else lesson_id
        lesson_uuid = to_uuid(scoped_lesson_key)
        lesson = await self.db.get(Lesson, lesson_uuid)
        if lesson is None:
            default_module_id = await self._ensure_default_module()
            lesson = Lesson(
                id=lesson_uuid,
                module_id=default_module_id,
                title=(topic or f"Lesson {lesson_id[:8]}"),
                topics=[],
                difficulty=str(state.get("level", "beginner")),
                order_index=1,
                best_video_url=(state.get("selected_video") or {}).get("url"),
            )
            self.db.add(lesson)
        else:
            if topic:
                lesson.title = topic
            lesson.best_video_url = (state.get("selected_video") or {}).get("url")

        transcript_text = state.get("transcript") or ""
        transcript_row = (
            (
                await self.db.execute(
                    select(Transcript).where(Transcript.lesson_id == lesson.id)
                )
            )
            .scalars()
            .first()
        )
        if transcript_row is None and transcript_text:
            transcript_row = Transcript(lesson_id=lesson.id, source="youtube", content=transcript_text)
            self.db.add(transcript_row)
        elif transcript_row and transcript_text:
            transcript_row.content = transcript_text

        notes_payload = state.get("notes") or {}
        notes_row = (
            (
                await self.db.execute(
                    select(LessonNote).where(LessonNote.lesson_id == lesson.id)
                )
            )
            .scalars()
            .first()
        )
        if notes_row is None and notes_payload:
            notes_row = LessonNote(
                lesson_id=lesson.id,
                short_summary=str(notes_payload.get("short_summary", "")),
                detailed_notes=str(notes_payload.get("detailed_notes", "")),
                key_points=list(notes_payload.get("key_points", [])),
            )
            self.db.add(notes_row)
        elif notes_row and notes_payload:
            notes_row.short_summary = str(notes_payload.get("short_summary", notes_row.short_summary))
            notes_row.detailed_notes = str(notes_payload.get("detailed_notes", notes_row.detailed_notes))
            notes_row.key_points = list(notes_payload.get("key_points", notes_row.key_points))

        quiz_payload = state.get("quiz") or {}
        lesson_quiz: Quiz | None = None
        if quiz_payload:
            generated_questions = list(quiz_payload.get("questions", []))
            if len(generated_questions) < 3:
                generated_questions = generated_questions[:]
                while len(generated_questions) < 3:
                    idx = len(generated_questions) + 1
                    generated_questions.append(
                        {
                            "question_id": f"q{idx}",
                            "question": f"Lesson check question {idx}",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "answer": "Option A",
                        }
                    )
            if len(generated_questions) > 5:
                generated_questions = generated_questions[:5]

            lesson_quiz = (
                (
                    await self.db.execute(
                        select(Quiz).where(Quiz.lesson_id == lesson.id).order_by(Quiz.created_at.desc())
                    )
                )
                .scalars()
                .first()
            )

            if lesson_quiz is None:
                lesson_quiz = Quiz(
                    lesson_id=lesson.id,
                    difficulty=str(quiz_payload.get("difficulty", "beginner")),
                    questions_json=generated_questions,
                )
                self.db.add(lesson_quiz)
            else:
                lesson_quiz.difficulty = str(quiz_payload.get("difficulty", lesson_quiz.difficulty))
                lesson_quiz.questions_json = generated_questions

            state["quiz"] = {
                "difficulty": str(quiz_payload.get("difficulty", "beginner")),
                "quiz_id": str(lesson_quiz.id),
                "questions": generated_questions,
            }

        await self.db.commit()
        await self.db.refresh(lesson)
        if lesson_quiz is not None:
            await self.db.refresh(lesson_quiz)
            state["quiz"] = {
                **(state.get("quiz") or {}),
                "quiz_id": str(lesson_quiz.id),
            }

        # Push transcript/summary artifacts into vector store for doubt and tutor RAG.
        try:
            settings = get_settings()
            collection_names = [f"lesson-{lesson.id}"]
            resolved_user_id = user_id or state.get("user_id")
            resolved_course_plan_id = course_plan_id or state.get("course_plan_id")
            if resolved_user_id and resolved_course_plan_id:
                collection_names.append(
                    f"{settings.chroma_collection_prefix}-{resolved_user_id}-{resolved_course_plan_id}"
                )

            texts: list[str] = []
            metadatas: list[dict] = []
            if transcript_text:
                texts.append(transcript_text)
                metadatas.append(
                    {
                        "type": "transcript",
                        "lesson_id": str(lesson.id),
                        "user_id": str(resolved_user_id or ""),
                        "course_plan_id": str(resolved_course_plan_id or ""),
                    }
                )
            if notes_payload.get("short_summary"):
                texts.append(str(notes_payload["short_summary"]))
                metadatas.append(
                    {
                        "type": "summary",
                        "lesson_id": str(lesson.id),
                        "user_id": str(resolved_user_id or ""),
                        "course_plan_id": str(resolved_course_plan_id or ""),
                    }
                )
            if notes_payload.get("detailed_notes"):
                texts.append(str(notes_payload["detailed_notes"]))
                metadatas.append(
                    {
                        "type": "notes",
                        "lesson_id": str(lesson.id),
                        "user_id": str(resolved_user_id or ""),
                        "course_plan_id": str(resolved_course_plan_id or ""),
                    }
                )
            if texts:
                for collection_name in collection_names:
                    vector_store = ChromaVectorStore(collection_name=collection_name)
                    vector_store.upsert_texts(texts=texts, metadatas=metadatas)
        except Exception:
            # Vector indexing is best-effort in local/dev mode.
            state["vector_indexing_status"] = "skipped"

        state["lesson_id"] = str(lesson.id)
        return state
