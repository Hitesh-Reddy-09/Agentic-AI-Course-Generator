from __future__ import annotations

from app.graph.supervisor import run_graph
from app.models.schemas import DoubtRequest, TutorChatRequest


class TutorService:
    async def ask_doubt(self, payload: DoubtRequest) -> dict:
        return await run_graph(
            {
                "intent": "ask_doubt",
                "user_id": payload.user_id,
                "course_plan_id": payload.course_plan_id,
                "question": payload.question,
                "messages": [],
            }
        )

    async def chat(self, payload: TutorChatRequest) -> dict:
        return await run_graph(
            {
                "intent": "chat_tutor",
                "user_id": payload.user_id,
                "course_plan_id": payload.course_plan_id,
                "question": payload.message,
                "messages": [],
            }
        )
