from __future__ import annotations

from langchain_core.messages import HumanMessage
from app.graph.state import GraphState
from app.tools.groq_llm import get_llm


def planner_agent(state: GraphState) -> GraphState:
    prompt = f"""
You are an expert instructional designer.

Create a course plan and return ONLY valid JSON (no markdown, no prose, no code fences, no extra keys).

USER INPUT
- Topic: {state.get('query')}
- Level: {state.get('level')}
- Goal: {state.get('goal')}
- Duration: {state.get('preferred_duration')}

OUTPUT RULES
1) Return exactly one JSON object.
2) Use the exact schema and key names below.
3) All ids must be STRINGS (e.g., "1", "1.1", "1.1.1").
4) Keep difficulty values to one of: "Easy", "Medium", "Hard".
5) Include 3 to 6 modules.
6) Each module must have 2 to 5 lessons.
7) Each lesson must have 2 to 6 topics.
8) Keep text concise and practical.
9) Do not include trailing commas.

REQUIRED JSON SCHEMA
{{
    "course_title": "string",
    "course_description": "string",
    "course_goal": "string",
    "course_duration": "string",
    "level": "Beginner|Intermediate|Advanced",
    "modules": [
        {{
            "module_id": "string",
            "module_title": "string",
            "module_description": "string",
            "difficulty": "Easy|Medium|Hard",
            "lessons": [
                {{
                    "lesson_id": "string",
                    "lesson_title": "string",
                    "lesson_description": "string",
                    "topics": [
                        {{
                            "topic_id": "string",
                            "topic_title": "string",
                            "topic_description": "string",
                            "difficulty": "Easy|Medium|Hard"
                        }}
                    ],
                    "resources": ["string"]
                }}
            ]
        }}
    ]
}}

EXAMPLE (FORMAT REFERENCE ONLY)
{{
    "course_title": "Introduction to Prompt Engineering",
    "course_description": "A practical beginner course to learn prompt design and evaluation.",
    "course_goal": "Design reliable prompts for real tasks.",
    "course_duration": "4 weeks",
    "level": "Beginner",
    "modules": [
        {{
            "module_id": "1",
            "module_title": "Prompt Fundamentals",
            "module_description": "Core concepts and prompt anatomy.",
            "difficulty": "Easy",
            "lessons": [
                {{
                    "lesson_id": "1.1",
                    "lesson_title": "Prompt Structure",
                    "lesson_description": "Understand roles, instructions, and constraints.",
                    "topics": [
                        {{
                            "topic_id": "1.1.1",
                            "topic_title": "Task Framing",
                            "topic_description": "Define objective, audience, and output.",
                            "difficulty": "Easy"
                        }}
                    ],
                    "resources": ["Video lecture", "Hands-on exercise"]
                }}
            ]
        }}
    ]
}}

Return ONLY the JSON object.
""".strip()
    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        raw_plan = response.content
    except Exception:
        raw_plan = {
            "modules": [
                {
                    "title": "Foundations",
                    "lessons": ["Concepts", "Hands-on basics"],
                    "difficulty": state.get("level", "beginner"),
                },
                {
                    "title": "Applied Practice",
                    "lessons": ["Project workflow", "Debugging and scaling"],
                    "difficulty": state.get("level", "beginner"),
                },
            ]
        }
    state["course_plan"] = {
        "title": f"Course for {state.get('query', 'learning goal')}",
        "raw_plan": raw_plan,
        "level": state.get("level", "beginner"),
    }
    return state
