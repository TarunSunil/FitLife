# Obsidian Fitness PWA

> Offline-first fitness tracker with a two-stage Gemini meal analysis pipeline, adaptive workout logic, and Supabase persistence. Installable as a native-feeling PWA on any device.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&labelColor=0f0f0f)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-scanner-009688?style=flat-square&logo=fastapi&logoColor=white&labelColor=0f0f0f)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white&labelColor=0f0f0f)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white&labelColor=0f0f0f)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0f0f0f)](https://typescriptlang.org)
[![PWA](https://img.shields.io/badge/PWA-offline--first-5A0FC8?style=flat-square&labelColor=0f0f0f)](#)

**Live:** [fit-life-indol.vercel.app](https://fit-life-indol.vercel.app)

---

## What it is

Obsidian Fitness is a progressive web app for tracking workouts and nutrition. It works offline by default — mutations queue locally and replay when connectivity is restored. The standout feature is **Quick Log**: photograph a meal and a two-stage Gemini pipeline identifies what's in the image and returns a complete nutritional breakdown, no barcode scanning required.

---

## Features

### Workout tracking
- Log sets, reps, and weight per exercise with inline editing
- Workout history with full CRUD and session notes
- Adaptive targets based on recent performance trends
- Offline mutation queue — logs sync automatically when back online

### Nutrition
- Daily diet logger with macro tracking (protein, carbs, fat, calories)
- Meal planner for the week ahead
- Shopping list generator from planned meals
- **Quick Log** — photograph any meal → Gemini stage 1 identifies items → stage 2 estimates macros → logged in one tap

### Settings
- Body targets (weight, body fat %, TDEE)
- Environment configuration (units, Supabase/local mode toggle)
- Notification preferences

---

## Two-stage Gemini meal analysis pipeline

```
User uploads photo
        │
        ▼
 FastAPI scanner service  ←──── Next.js server action (avoids CORS, rate-limits)
        │
   Stage 1: Vision
   Gemini identifies food items in the image
        │
   Stage 2: Estimation
   Gemini estimates macros per item using portion heuristics
        │
        ▼
 Structured JSON response → Auto-populated log entry
```

The two-stage design keeps the prompts focused: identification and estimation are separate concerns with separate context windows, which significantly improves macro accuracy over a single combined prompt.

---

## Architecture

```
fit-life/
├── app/
│   ├── (dashboard)/        # Main dashboard, stats overview
│   ├── workout-logger/     # Live workout session
│   ├── workout-logs/       # History, CRUD
│   ├── diet/               # Logger, planner, shopping list
│   ├── settings/           # User config
│   └── api/
│       └── scan/           # Proxies image to FastAPI scanner
├── backend/
│   └── app/
│       └── main.py         # FastAPI meal scanner (two-stage Gemini)
├── supabase/
│   └── migrations/         # Nutrition schema, RLS policies
├── public/
│   └── sw.js               # Service Worker — offline mutation queue
└── components/             # Shared UI components
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| AI | Google Gemini (vision + text) |
| Scanner API | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| Offline | Service Worker, IndexedDB mutation queue |
| Deployment | Vercel (frontend) |

---

## Local setup

**Prerequisites:** Node.js 18+, Python 3.11+, Supabase account (or run in local mode).

### Frontend

```bash
git clone https://github.com/TarunSunil/FitLife.git
cd FitLife
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url       # optional: local mode works without this
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # optional
FASTAPI_SCAN_URL=http://localhost:8000            # or NEXT_PUBLIC_FASTAPI_URL
GEMINI_API_KEY=your_gemini_key
```

```bash
npm run dev   # http://localhost:3000
```

### FastAPI scanner (required for Quick Log)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> If FastAPI is not running, Quick Log will fail with a connection error. All other features work without it.

### Supabase (optional)

Apply the nutrition schema migration:

1. Open the Supabase SQL editor for your project
2. Run the SQL from `supabase/migrations/20260327_add_nutrition_tables.sql`

Without Supabase configured, the app runs in **local mode** — all data persists to local JSON storage.

---

## Supported image formats

Quick Log accepts **JPG/JPEG**, **PNG**, and **WEBP** for meal scanning.
