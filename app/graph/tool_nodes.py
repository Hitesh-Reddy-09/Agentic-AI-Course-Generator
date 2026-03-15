from __future__ import annotations

from app.graph.state import GraphState


def planner_tool_node(state: GraphState) -> GraphState:
    plan = state.get("course_plan") or {}
    state["course_plan"] = {**plan, "planner_tool_used": True}
    return state


def rag_tool_node(state: GraphState) -> GraphState:
    state["messages"] = [
        *state.get("messages", []),
        {"role": "system", "content": "rag_tool_node prepared retrieval context"},
    ]
    return state


def progress_tool_node(state: GraphState) -> GraphState:
    progress = state.get("progress") or {}
    state["progress"] = {**progress, "progress_tool_used": True}
    return state


def quiz_tool_node(state: GraphState) -> GraphState:
    quiz = state.get("quiz") or {}
    state["quiz"] = {**quiz, "quiz_tool_used": True}
    return state
