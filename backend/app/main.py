import base64
import json
import os
import re
import threading
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.api_core.exceptions import ResourceExhausted
from PIL import Image


def _load_env_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        # Keep shell-exported variables highest priority.
        if key and os.getenv(key) is None:
            os.environ[key] = value


# Load backend env from common local locations if vars are not already exported.
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_BACKEND_ROOT = CURRENT_DIR.parent
ENV_CANDIDATES = [
    PROJECT_BACKEND_ROOT / ".env",
    PROJECT_BACKEND_ROOT / "backend" / ".env",
    PROJECT_BACKEND_ROOT / ".env.Backlocal",
]

for _env_path in ENV_CANDIDATES:
    _load_env_file(_env_path)

app = FastAPI(title="FitLife PG-Aware Scanner")

allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MODEL_FALLBACK_ORDER = [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash",
]

SYSTEM_PROMPT = (
    'Identify the Indian food items in this image. Context: This is PG/Hostel mess food—assume high '
    'oil/fat content (+10g fat per gravy) and standard Katori serving sizes. Provide a nutritional '
    'breakdown for Calories, Protein (g), Carbs (g), and Fats (g). Return ONLY a raw JSON object: '
    '{ "dish_name": "", "ingredients": [], "calories": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0 }'
)

_key_rotation_lock = threading.Lock()
_key_rotation_counter = 0


def _next_gemini_key() -> str:
    global _key_rotation_counter

    key_a = os.getenv("GEMINI_KEY_A", "").strip()
    key_b = os.getenv("GEMINI_KEY_B", "").strip()
    available = [key for key in [key_a, key_b] if key]

    if not available:
        raise HTTPException(status_code=500, detail="Missing GEMINI_KEY_A/GEMINI_KEY_B")

    with _key_rotation_lock:
        selected = available[_key_rotation_counter % len(available)]
        _key_rotation_counter += 1

    return selected


def _strip_markdown_json(raw_text: str) -> str:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _extract_json_block(raw_text: str) -> dict[str, Any]:
    raw_text = _strip_markdown_json(raw_text)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise HTTPException(status_code=502, detail="Gemini response did not include valid JSON")

    fragment = raw_text[start : end + 1]
    try:
        return json.loads(fragment)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to parse Gemini JSON: {exc.msg}") from exc


def _normalize_ingredients(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]

    if isinstance(raw, str):
        return [piece.strip() for piece in re.split(r"[,;\n]", raw) if piece.strip()]

    return []


def _normalize_response(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        dish_name = str(payload["dish_name"]).strip()
        ingredients = _normalize_ingredients(payload.get("ingredients", []))
        calories = float(payload["calories"])
        protein_g = float(payload["protein_g"])
        carbs_g = float(payload["carbs_g"])
        fats_g = float(payload["fats_g"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Gemini JSON missing required nutrition fields") from exc

    if not dish_name:
        raise HTTPException(status_code=502, detail="Gemini JSON returned empty dish_name")

    return {
        "dish_name": dish_name,
        "ingredients": ingredients,
        "calories": max(0, round(calories)),
        "protein_g": max(0, round(protein_g)),
        "carbs_g": max(0, round(carbs_g)),
        "fats_g": max(0, round(fats_g)),
    }


async def _call_model(base64_data: str, model: str, key: str) -> dict[str, Any]:
    base_url = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")
    endpoint = f"{base_url}/models/{model}:generateContent?key={key}"

    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_data,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(endpoint, json=request_body)

    if response.status_code == 429:
        raise ResourceExhausted("Gemini rate limit/resource exhausted")

    response.raise_for_status()
    return response.json()


async def _analyze_impl(file: UploadFile) -> dict[str, Any]:
    if file.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large. Max size is 8MB")

    # Validate and normalize image bytes through PIL before sending to Gemini.
    try:
        with Image.open(BytesIO(image_bytes)) as img:
            rgb = img.convert("RGB")
            buffer = BytesIO()
            rgb.save(buffer, format="JPEG", quality=90)
            normalized_bytes = buffer.getvalue()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}") from exc

    base64_data = base64.b64encode(normalized_bytes).decode("utf-8")

    last_exhausted: ResourceExhausted | None = None

    for model in MODEL_FALLBACK_ORDER:
        key = _next_gemini_key()
        try:
            data = await _call_model(base64_data, model, key)
        except ResourceExhausted as exc:
            last_exhausted = exc
            continue
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Gemini API status error: {exc}") from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Gemini API request failed: {exc}") from exc

        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

        if not raw_text:
            raise HTTPException(status_code=502, detail="Gemini returned an empty response")

        parsed_json = _extract_json_block(raw_text)
        return _normalize_response(parsed_json)

    raise HTTPException(
        status_code=429,
        detail="All configured Gemini models are currently rate-limited.",
    ) from last_exhausted


@app.post("/analyze-meal")
async def analyze_meal(file: UploadFile = File(...)) -> dict[str, Any]:
    return await _analyze_impl(file)


@app.post("/scan")
async def scan_meal(file: UploadFile = File(...)) -> dict[str, Any]:
    return await _analyze_impl(file)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
