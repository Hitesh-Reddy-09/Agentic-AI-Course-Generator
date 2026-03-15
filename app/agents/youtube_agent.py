from __future__ import annotations

from app.graph.state import GraphState
from app.tools.youtube_tool import YouTubeTool


def youtube_agent(state: GraphState) -> GraphState:
    tool = YouTubeTool()
    query = (state.get("query") or "").strip()
    if not query:
        lesson_hint = str(state.get("lesson_id", "")).strip()
        query = f"{lesson_hint} tutorial" if lesson_hint else "beginner tutorial"
    videos = tool.search_videos(query)
    state["selected_video"] = videos[0] if videos else {}
    return state
