# AI Course Generator

Full-stack AI learning platform with:
- FastAPI + LangGraph backend (course planning, lessons, notes, quiz, progress, exam, certificate)
- React + Vite frontend (auth, course flow, lesson viewer, in-lesson quiz gating, dashboard)
- PostgreSQL persistence and Chroma vector retrieval for tutor/doubt context

## Features

- AI-generated course plan with approval flow
- Lesson pipeline: video -> transcript -> summary + detailed notes -> quiz
- Dynamic lesson quiz (3-5 questions), pass-gated lesson progression
- Real progress tracking from actual quiz attempts
- In-lesson doubt assistant and tutor chat
- Final exam and certificate retrieval
- Course history and reopen flow from dashboard

## Tech Stack

Backend:
- Python 3.11+
- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- LangGraph + LangChain
- Groq LLM
- ChromaDB + HuggingFace embeddings

Frontend:
- React 18 + TypeScript
- Vite
- Zustand
- TanStack Query
- Tailwind + shadcn/ui

## Repository Structure

```
app/
  agents/
  api/
  core/
  db/
  graph/
  models/
  rag/
  services/
  tools/
  utils/
frontend-course-creator-ai/
migrations/
scripts/
tests/
```

## Environment Variables

Copy and edit env values:

```bash
cp .env.example .env
```

Important variables:
- `POSTGRES_URL`
- `CHECKPOINTER_DB_URI`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `YOUTUBE_API_KEY`
- `CHROMA_PERSIST_DIRECTORY`
- `CHROMA_COLLECTION_PREFIX`
- `API_PREFIX` (default `/api/v1`)

Frontend variable:
- `VITE_API_BASE_URL` (default `http://127.0.0.1:8000/api/v1`)

Create `frontend-course-creator-ai/.env` if needed:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Local Development

### 1) Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2) Setup backend

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -e .[dev]
python scripts/init_db.py
uvicorn app.main:app --reload
```

API health:

```bash
GET http://127.0.0.1:8000/health
```

### 3) Setup frontend

```bash
cd frontend-course-creator-ai
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Build and Test

Backend:

```bash
pytest
```

Frontend:

```bash
cd frontend-course-creator-ai
npm run build
npm run test
```

## API Overview

Base prefix: `/api/v1`

- `POST /auth/register`
- `POST /auth/login`
- `POST /courses`
- `POST /courses/approve`
- `GET /courses/{lesson_id}/lesson`
- `POST /courses/quiz/submit`
- `GET /courses/{course_plan_id}/progress/{user_id}`
- `POST /courses/exam`
- `GET /courses/{course_plan_id}/certificate/{user_id}`
- `POST /tutor/doubt`
- `POST /tutor/chat`

## Deployment Notes

Recommended split deployment:
- Backend: Render / Railway / Fly.io / Azure Web App
- Frontend: Vercel / Netlify
- Database: Managed PostgreSQL (Neon / Supabase / Railway Postgres)

### Backend deployment checklist

1. Set all backend env vars (`POSTGRES_URL`, `CHECKPOINTER_DB_URI`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`, etc).
2. Ensure `POSTGRES_URL` uses async driver form: `postgresql+asyncpg://...`
3. Ensure `CHECKPOINTER_DB_URI` uses sync psycopg form: `postgresql://...`
4. Run DB init/migrations during release.
5. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend deployment checklist

1. Set `VITE_API_BASE_URL` to deployed backend URL with `/api/v1` suffix.
2. Build command: `npm run build`
3. Output directory: `dist`

## GitHub Push Checklist

Before pushing:

1. Remove secrets from tracked files.
2. Verify `.env` is not committed.
3. Keep `.env.example` with placeholders only.
4. Rotate any key that was ever exposed in git history.
5. Confirm both backend and frontend build locally.

## Current Product Behavior

- Quizzes are generated per lesson context.
- Notes are detailed and formatted separately from summary.
- Progress is computed from persisted quiz attempts (attempt count, average score, weak topics, lessons completed).
- Next lesson unlocks only after quiz pass for current lesson.

## License

Add your preferred license before publishing.
