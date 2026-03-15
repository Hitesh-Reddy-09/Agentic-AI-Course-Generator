from __future__ import annotations

from app.graph.state import GraphState


def human_approval_node(state: GraphState) -> GraphState:
    approved = state.get("approved")
    if approved is None:
        state["status"] = "awaiting_human_approval"
        state["next_node"] = "END"
        return state

    if approved:
        state["status"] = "approved"
        # Approval finalizes the plan. Lesson pipeline runs via get_lesson endpoint.
        state["next_node"] = "END"
        return state

    if state.get("user_edits"):
        state["query"] = (
            f"{state.get('query', '')}\nUser requested edits: {state['user_edits']}"
        )
        state["next_node"] = "planner_agent"
        return state

    state["status"] = "rejected"
    state["next_node"] = "END"
    return state
