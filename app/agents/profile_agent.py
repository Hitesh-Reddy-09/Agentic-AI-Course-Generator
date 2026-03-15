from __future__ import annotations

import re
from app.graph.state import GraphState


def profile_agent(state: GraphState) -> GraphState:
    query = state.get("query", "").lower()

    level = "beginner"
    if re.search(r"advanced|expert|production", query):
        level = "advanced"
    elif re.search(r"intermediate|already know|experience", query):
        level = "intermediate"

    duration = "self-paced"
    if "week" in query:
        duration = "weekly plan"
    if "month" in query:
        duration = "monthly plan"

    state["level"] = level
    state["goal"] = state.get("query", "")
    state["preferred_duration"] = duration
    return state
