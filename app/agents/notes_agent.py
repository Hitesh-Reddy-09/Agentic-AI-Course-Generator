from __future__ import annotations

import json
from langchain_core.messages import HumanMessage
from app.graph.state import GraphState
from app.tools.groq_llm import get_llm


def notes_agent(state: GraphState) -> GraphState:
    transcript = state.get("transcript", "")
    if not transcript:
        state["notes"] = {
            "short_summary": "Transcript unavailable",
            "detailed_notes": "No transcript found for this lesson.",
            "key_points": [],
        }
        return state

    try:
        llm = get_llm()
        prompt = f"""
You are an expert technical note-taker.

From the lesson transcript below, create:
1) A short summary in 4-6 lines.
2) Detailed, well-formatted study notes suitable for revision.
3) 5-8 key points.

Return ONLY valid JSON with this schema:
{{
  "short_summary": "string",
  "detailed_notes": "string",
  "key_points": ["string"]
}}

Rules:
- `detailed_notes` must be clearly structured with section headers, bullets, and practical takeaways.
- Cover definitions, workflow/steps, examples mentioned, common mistakes, and recap.
- Keep language beginner-friendly and actionable.
- Base content on transcript only; do not invent unrelated topics.

Transcript:
{transcript[:12000]}
""".strip()

        response = llm.invoke([HumanMessage(content=prompt)])
        raw = str(response.content).strip()
        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(raw)
        short_summary = str(parsed.get("short_summary", "")).strip()
        detailed_notes = str(parsed.get("detailed_notes", "")).strip()
        key_points_raw = parsed.get("key_points", [])
        key_points = [str(point).strip() for point in list(key_points_raw) if str(point).strip()]

        if not short_summary or not detailed_notes:
            raise ValueError("LLM response missing required note fields")

        state["notes"] = {
            "short_summary": short_summary[:900],
            "detailed_notes": detailed_notes[:8000],
            "key_points": key_points[:8],
        }
        return state
    except Exception:
        # Transcript-based deterministic fallback to avoid generic placeholder notes.
        transcript_lines = [line.strip() for line in str(transcript).splitlines() if line.strip()]
        merged = " ".join(transcript_lines)
        sentences = [s.strip() for s in merged.replace("\n", " ").split(".") if s.strip()]
        summary_candidates = sentences[:5] if sentences else ["Review the transcript for lesson details."]
        short_summary = "\n".join(f"- {s}." for s in summary_candidates)

        detailed_notes = "\n\n".join(
            [
                "## 1) Core Concepts",
                "- " + "\n- ".join(summary_candidates[:4]),
                "## 2) What Happens in This Lesson",
                "- Follow the explanation in sequence from basics to examples.",
                "- Re-run demonstrated steps while reading the transcript.",
                "## 3) Practical Takeaways",
                "- Convert each concept into one small hands-on exercise.",
                "- Validate your understanding by explaining each step in your own words.",
                "## 4) Common Mistakes to Avoid",
                "- Skipping foundational definitions before implementation.",
                "- Moving to next lesson without attempting the quiz and revision.",
                "## 5) Quick Revision Checklist",
                "- Can you explain the main idea without looking at notes?",
                "- Can you implement one small example from memory?",
                "- Can you solve the quiz questions confidently?",
            ]
        )

        key_points = [s.strip() for s in summary_candidates[:6] if s.strip()]
        state["notes"] = {
            "short_summary": short_summary[:900],
            "detailed_notes": detailed_notes[:8000],
            "key_points": key_points,
        }
    return state
