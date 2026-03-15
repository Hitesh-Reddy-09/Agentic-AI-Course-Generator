from __future__ import annotations

from typing import Any, Literal, TypedDict


class GraphState(TypedDict, total=False):
    intent: str
    user_id: str
    course_plan_id: str
    lesson_id: str
    quiz_id: str
    exam_id: str
    query: str
    question: str
    approved: bool
    user_edits: dict[str, Any]
    answers: list[dict[str, Any]]

    level: Literal["beginner", "intermediate", "advanced"]
    goal: str
    preferred_duration: str

    course_plan: dict[str, Any]
    selected_video: dict[str, Any]
    transcript: str
    notes: dict[str, Any]
    quiz: dict[str, Any]
    quiz_result: dict[str, Any]
    progress: dict[str, Any]
    exam: dict[str, Any]
    exam_result: dict[str, Any]
    certificate: dict[str, Any]
    rag_answer: str
    tutor_answer: str

    messages: list[dict[str, str]]
    next_node: str
    status: str
    error: str
