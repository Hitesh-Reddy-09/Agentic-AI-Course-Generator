from __future__ import annotations

from app.graph.state import GraphState


def exam_agent(state: GraphState) -> GraphState:
    if state.get("answers"):
        score = 78.0
        state["exam_result"] = {
            "score": score,
            "passed": score >= 70,
        }
    else:
        state["exam"] = {
            "questions": [
                {"question": "Explain LangGraph supervisor pattern.", "type": "subjective"},
                {"question": "How does RAG improve tutor answers?", "type": "subjective"},
                {"question": "What is checkpointer role in workflow durability?", "type": "subjective"},
            ]
        }
    return state
