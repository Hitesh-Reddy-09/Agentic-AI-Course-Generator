from __future__ import annotations

from app.graph.state import GraphState


def progress_agent(state: GraphState) -> GraphState:
    quiz_result = state.get("quiz_result") or {}
    score = float(quiz_result.get("score", 0.0))

    weak_topics = []
    if score < 60:
        weak_topics = ["core concepts", "applied practice"]

    state["progress"] = {
        "lessons_completed": 1,
        "average_quiz_score": score,
        "weak_topics": weak_topics,
        "attempts_count": 1,
        "time_spent_minutes": 25,
    }
    return state
