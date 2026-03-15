from __future__ import annotations

import json
from langchain_core.messages import HumanMessage
from app.graph.state import GraphState
from app.tools.groq_llm import get_llm


def _normalize_questions(raw_questions: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for idx, question in enumerate(raw_questions, start=1):
        if not isinstance(question, dict):
            continue
        q_text = str(question.get("question", "")).strip()
        options = [str(opt).strip() for opt in list(question.get("options", [])) if str(opt).strip()]
        answer = str(question.get("answer", "")).strip()
        if not q_text or len(options) < 2:
            continue
        if answer and answer not in options:
            options = [*options[:3], answer] if len(options) >= 3 else [*options, answer]
        normalized.append(
            {
                "question_id": str(question.get("question_id") or f"q{idx}"),
                "question": q_text,
                "options": options[:4],
                "answer": answer or options[0],
            }
        )
    return normalized[:5]


def _fallback_questions(state: GraphState, lesson_topic: str) -> list[dict]:
    notes = state.get("notes") or {}
    key_points = [str(p).strip() for p in list(notes.get("key_points") or []) if str(p).strip()]
    transcript = str(state.get("transcript") or "").strip()
    transcript_hint = transcript[:140] if transcript else "the current lesson transcript"

    base = [
        {
            "question_id": "q1",
            "question": f"In this lesson on {lesson_topic}, what is the primary takeaway?",
            "options": [
                "Understand and apply the core idea in practice",
                "Memorize terms without implementation",
                "Skip exercises and examples",
                "Ignore lesson context",
            ],
            "answer": "Understand and apply the core idea in practice",
        },
        {
            "question_id": "q2",
            "question": "Which learning action best validates understanding after the video?",
            "options": [
                "Solve a small practice task",
                "Move to next topic immediately",
                "Avoid checking mistakes",
                "Skip recap",
            ],
            "answer": "Solve a small practice task",
        },
        {
            "question_id": "q3",
            "question": f"Which statement is most aligned with this lesson context: {transcript_hint}?",
            "options": [
                "Use the explained workflow step by step",
                "Assume all cases behave the same",
                "Ignore constraints mentioned",
                "Replace validation with guesses",
            ],
            "answer": "Use the explained workflow step by step",
        },
        {
            "question_id": "q4",
            "question": f"Which key point was emphasized: {key_points[0] if key_points else 'lesson summary'}?",
            "options": [
                "It should be practiced and reviewed",
                "It is optional for understanding",
                "It is unrelated to the lesson",
                "It can be skipped",
            ],
            "answer": "It should be practiced and reviewed",
        },
        {
            "question_id": "q5",
            "question": "What should you do if quiz score is below pass threshold?",
            "options": [
                "Revisit notes and retry",
                "Ignore the weak topics",
                "Skip directly to final exam",
                "Stop practicing",
            ],
            "answer": "Revisit notes and retry",
        },
    ]
    return base


def _generate_lesson_quiz(state: GraphState, lesson_topic: str) -> list[dict]:
    transcript = str(state.get("transcript") or "").strip()
    notes = state.get("notes") or {}
    summary = str(notes.get("short_summary") or "").strip()
    key_points = list(notes.get("key_points") or [])
    context = "\n".join(
        [
            f"Lesson topic: {lesson_topic}",
            f"Summary: {summary}",
            f"Key points: {', '.join(str(k) for k in key_points[:5])}",
            f"Transcript excerpt: {transcript[:4000]}",
        ]
    ).strip()

    if not context:
        return _fallback_questions(state, lesson_topic)

    prompt = (
        "Create exactly 5 multiple-choice quiz questions for the provided lesson context. "
        "Questions must be lesson-specific, practical, and beginner-friendly. "
        "Return ONLY valid JSON array with objects in this format: "
        "{\"question_id\":\"q1\",\"question\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"answer\":\"one option exactly\"}.\n\n"
        f"{context}"
    )
    try:
        llm = get_llm(temperature=0.3)
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = str(response.content).strip()
        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return _fallback_questions(state, lesson_topic)
        normalized = _normalize_questions(parsed)
        if len(normalized) < 3:
            return _fallback_questions(state, lesson_topic)
        return normalized[:5]
    except Exception:
        return _fallback_questions(state, lesson_topic)


def quiz_agent(state: GraphState) -> GraphState:
    level = state.get("level", "beginner")
    intent = str(state.get("intent") or "")
    lesson_topic = str(
        state.get("query")
        or (state.get("selected_video") or {}).get("title")
        or state.get("lesson_id")
        or "this lesson"
    ).strip()

    # For quiz submission, score exactly against provided persisted quiz questions.
    if intent == "submit_quiz":
        provided_quiz = state.get("quiz") or {}
        provided_questions = _normalize_questions(list(provided_quiz.get("questions") or []))
        questions = provided_questions if provided_questions else _fallback_questions(state, lesson_topic)
    else:
        # Always generate fresh per-lesson questions; do not reuse checkpointer quiz state.
        questions = _generate_lesson_quiz(state, lesson_topic)
        if len(questions) < 3:
            questions = _fallback_questions(state, lesson_topic)

    state["quiz"] = {
        "difficulty": level,
        "questions": questions,
    }

    answers = state.get("answers") or []
    if answers:
        answer_lookup = {
            str(item.get("question_id", "")): str(item.get("answer", ""))
            for item in answers
            if isinstance(item, dict)
        }
        correct_count = 0
        weak_topics: list[str] = []
        for q in questions:
            qid = str(q.get("question_id", ""))
            expected = str(q.get("answer") or q.get("correct_answer") or "")
            submitted = answer_lookup.get(qid, "")
            if expected and submitted and submitted.strip().lower() == expected.strip().lower():
                correct_count += 1
            else:
                weak_topics.append(str(q.get("question", "Unknown topic")))

        total = max(len(questions), 1)
        score_percent = round((correct_count / total) * 100, 2)
        passed = score_percent >= 70.0
        state["quiz_result"] = {
            "score": score_percent,
            "total": total,
            "correct": correct_count,
            "passed": passed,
            "weak_topics": weak_topics,
            "recommendation": (
                "Great job. You can move to the next lesson."
                if passed
                else "Revise this lesson and retry the quiz before moving on."
            ),
        }
    return state
