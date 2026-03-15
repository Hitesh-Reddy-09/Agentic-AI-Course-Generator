from __future__ import annotations

from datetime import datetime
from app.graph.state import GraphState


def certificate_agent(state: GraphState) -> GraphState:
    exam_result = state.get("exam_result") or {}
    if not exam_result.get("passed"):
        state["certificate"] = {"eligible": False}
        return state

    state["certificate"] = {
        "eligible": True,
        "user_id": state.get("user_id"),
        "course_plan_id": state.get("course_plan_id"),
        "final_score": exam_result.get("score", 0.0),
        "level": state.get("level", "beginner"),
        "issued_at": datetime.utcnow().isoformat(),
    }
    return state
