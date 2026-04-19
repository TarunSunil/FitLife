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

Meal image analysis now calls FastAPI directly from the diet scan UI.

Required frontend env variable:

- `NEXT_PUBLIC_FASTAPI_URL`

Backend env variables (inside `backend/.env`):

- `GEMINI_KEY_A`
- `GEMINI_KEY_B`
- `ALLOWED_ORIGINS` (optional)

### Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
