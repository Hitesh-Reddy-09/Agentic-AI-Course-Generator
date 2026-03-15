from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import CoursePlan, User
from app.graph.supervisor import run_graph
from app.models.schemas import CourseCreateRequest, CoursePlanApprovalRequest
from app.utils.ids import to_uuid


class CourseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_course(self, payload: CourseCreateRequest) -> dict:
        state = {
            "intent": "create_course",
            "user_id": payload.user_id,
            "query": payload.query,
            "messages": [],
        }
        graph_result = await run_graph(state)

        user_id = to_uuid(payload.user_id)
        user = await self.db.get(User, user_id)
        if user is None:
            user = User(id=user_id, name=f"Learner-{str(user_id)[:8]}")
            self.db.add(user)

        generated_plan = graph_result.get("course_plan") or {}
        course_plan = CoursePlan(
            user_id=user_id,
            query=payload.query,
            title=generated_plan.get("title", "Generated Course Plan"),
            level=str(generated_plan.get("level", "beginner")),
            goal=payload.query,
            preferred_duration=str(graph_result.get("preferred_duration", "self-paced")),
            status="draft",
            plan_json=generated_plan,
        )
        self.db.add(course_plan)
        await self.db.commit()
        await self.db.refresh(course_plan)

        graph_result["course_plan_id"] = str(course_plan.id)
        return graph_result

    async def approve_course(self, payload: CoursePlanApprovalRequest) -> dict:
        state = {
            "intent": "approve_course",
            "course_plan_id": payload.course_plan_id,
            "approved": payload.approved,
            "user_edits": payload.user_edits or {},
            "messages": [],
        }
        graph_result = await run_graph(state)

        stmt = select(CoursePlan).where(CoursePlan.id == to_uuid(payload.course_plan_id))
        plan = (await self.db.execute(stmt)).scalar_one_or_none()
        if plan:
            plan.status = "approved" if payload.approved else "rejected"
            if payload.user_edits:
                updated_plan = dict(plan.plan_json)
                updated_plan["user_edits"] = payload.user_edits
                plan.plan_json = updated_plan
            await self.db.commit()

        return graph_result
