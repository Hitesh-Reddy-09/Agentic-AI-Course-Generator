from __future__ import annotations

import asyncio
from langgraph.graph import END, START, StateGraph
from app.agents.certificate_agent import certificate_agent
from app.agents.doubt_rag_agent import doubt_rag_agent
from app.agents.exam_agent import exam_agent
from app.agents.human_approval_node import human_approval_node
from app.agents.notes_agent import notes_agent
from app.agents.planner_agent import planner_agent
from app.agents.profile_agent import profile_agent
from app.agents.progress_agent import progress_agent
from app.agents.quiz_agent import quiz_agent
from app.agents.transcript_agent import transcript_agent
from app.agents.tutor_chat_agent import tutor_chat_agent
from app.agents.youtube_agent import youtube_agent
from app.graph.checkpointer import get_checkpointer
from app.graph.memory import memory_store
from app.graph.state import GraphState
from app.graph.tool_nodes import planner_tool_node, progress_tool_node, quiz_tool_node, rag_tool_node


def _route_from_supervisor(state: GraphState) -> str:
    intent = state.get("intent", "")
    if intent == "create_course":
        return "profile_agent"
    if intent == "approve_course":
        return "human_approval_node"
    if intent == "get_lesson":
        return "youtube_agent"
    if intent == "submit_quiz":
        return "quiz_tool_node"
    if intent == "ask_doubt":
        return "rag_tool_node"
    if intent == "chat_tutor":
        return "rag_tool_node"
    if intent == "get_progress":
        return "progress_tool_node"
    if intent == "take_exam":
        return "exam_agent"
    if intent == "get_certificate":
        return "certificate_agent"
    return END


def _route_after_approval(state: GraphState) -> str:
    next_node = state.get("next_node")
    if next_node == "planner_agent":
        return "planner_agent"
    if next_node == "youtube_agent":
        return "youtube_agent"
    return END


def build_graph(checkpointer):
    builder = StateGraph(GraphState)

    builder.add_node("supervisor", lambda s: s)
    builder.add_node("profile_agent", profile_agent)
    builder.add_node("planner_agent", planner_agent)
    builder.add_node("human_approval_node", human_approval_node)
    builder.add_node("planner_tool_node", planner_tool_node)
    builder.add_node("rag_tool_node", rag_tool_node)
    builder.add_node("progress_tool_node", progress_tool_node)
    builder.add_node("quiz_tool_node", quiz_tool_node)
    builder.add_node("youtube_agent", youtube_agent)
    builder.add_node("transcript_agent", transcript_agent)
    builder.add_node("notes_agent", notes_agent)
    builder.add_node("quiz_agent", quiz_agent)
    builder.add_node("doubt_rag_agent", doubt_rag_agent)
    builder.add_node("tutor_chat_agent", tutor_chat_agent)
    builder.add_node("progress_agent", progress_agent)
    builder.add_node("exam_agent", exam_agent)
    builder.add_node("certificate_agent", certificate_agent)

    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges("supervisor", _route_from_supervisor)

    builder.add_edge("profile_agent", "planner_tool_node")
    builder.add_edge("planner_tool_node", "planner_agent")
    builder.add_edge("planner_agent", "human_approval_node")
    builder.add_conditional_edges("human_approval_node", _route_after_approval)

    builder.add_edge("youtube_agent", "transcript_agent")
    builder.add_edge("transcript_agent", "notes_agent")
    builder.add_edge("notes_agent", "quiz_agent")
    builder.add_edge("quiz_agent", "progress_tool_node")
    builder.add_edge("progress_tool_node", "progress_agent")
    builder.add_edge("progress_agent", END)

    builder.add_edge("quiz_tool_node", "quiz_agent")

    def _route_after_rag_tool(state: GraphState) -> str:
        intent = state.get("intent", "")
        if intent == "ask_doubt":
            return "doubt_rag_agent"
        return "tutor_chat_agent"

    builder.add_conditional_edges("rag_tool_node", _route_after_rag_tool)
    builder.add_edge("doubt_rag_agent", END)
    builder.add_edge("tutor_chat_agent", END)
    builder.add_edge("exam_agent", "certificate_agent")
    builder.add_edge("certificate_agent", END)

    return builder.compile(checkpointer=checkpointer)


_graph = None
_graph_lock = asyncio.Lock()


async def get_graph():
    global _graph
    if _graph is not None:
        return _graph

    async with _graph_lock:
        if _graph is not None:
            return _graph
        checkpointer = await get_checkpointer()
        _graph = build_graph(checkpointer)
        return _graph


async def run_graph(state: GraphState) -> dict:
    user_id = state.get("user_id", "anonymous")
    thread_id = str(user_id)
    config = {"configurable": {"thread_id": thread_id}}

    inbound = state.get("question") or state.get("query")
    if inbound:
        try:
            await memory_store.save_message(
                user_id=user_id,
                session_id=thread_id,
                role="user",
                content=str(inbound),
            )
        except Exception:
            pass

    graph = await get_graph()
    result = await graph.ainvoke(state, config=config)

    outbound = result.get("rag_answer") or result.get("tutor_answer")
    if outbound:
        try:
            await memory_store.save_message(
                user_id=user_id,
                session_id=thread_id,
                role="assistant",
                content=str(outbound),
            )
        except Exception:
            pass

    return result
