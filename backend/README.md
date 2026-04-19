# FitLife FastAPI Scanner

PG-aware image scan backend with Gemini key rotation.

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env template and set keys:

```bash
copy .env.example .env
```

Required backend env vars:

- GEMINI_KEY_A
- GEMINI_KEY_B

Optional:

- ALLOWED_ORIGINS (comma-separated)

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- POST /scan (multipart/form-data with file field named `file`)
- GET /health
