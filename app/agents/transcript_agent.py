from __future__ import annotations

from app.graph.state import GraphState
from app.tools.transcript_tool import TranscriptTool


def transcript_agent(state: GraphState) -> GraphState:
    selected = state.get("selected_video", {})
    video_id = selected.get("video_id")
    if not video_id:
        state["transcript"] = ""
        return state

    transcript = TranscriptTool().fetch_transcript(video_id)
    state["transcript"] = transcript
    return state
