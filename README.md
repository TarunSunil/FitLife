## Obsidian Fitness PWA

Next.js 15 fitness tracking app with adaptive workout logic, diet planning, and offline-first mutation replay.

### Main routes

- `/` dashboard
- `/workout-logger` workout entry
- `/workout-logs` workout history and CRUD
- `/diet` diet logger, planner, and shopping list
- `/settings` environment and target configuration

### Local development

1. Install dependencies.
2. Run the dev server.

```bash
npm install
npm run dev
```

### Optional Supabase mode

If these variables are set, persistence is routed to Supabase instead of local JSON:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply the nutrition schema migration in your Supabase project:

1. Open the SQL editor.
2. Run the SQL from `supabase/migrations/20260327_add_nutrition_tables.sql`.

### Meal Scan Analyzer (PG-Aware FastAPI)

Meal image analysis calls FastAPI through a Next.js server action so the browser avoids CORS issues and the app can rate-limit scan usage.

Required Next.js env variable:

- `FASTAPI_SCAN_URL` or `NEXT_PUBLIC_FASTAPI_URL`

Quick Log uploads currently support: `JPG/JPEG`, `PNG`, and `WEBP`.

Quick Log requires both services running locally:

1. Next.js app (`npm run dev`) on `http://localhost:3000`
2. FastAPI scanner (`uvicorn app.main:app --reload --port 8000`) from `backend/`

If FastAPI is down, Quick Log will fail with a connection error.

Backend env variables (inside `backend/.env`):

- `GEMINI_KEY_A`
- `GEMINI_KEY_B`
- `ALLOWED_ORIGINS` (optional)
- `GEMINI_MODELS` (optional comma-separated fallback order)
- `MAX_NORMALIZED_IMAGE_EDGE` (optional, default `1280`)
- `NORMALIZED_JPEG_QUALITY` (optional, default `82`)

### Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
