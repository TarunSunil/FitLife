# Food Photo Scan Debug Plan

## Scope
- [x] Review existing lessons and prior API audit notes.
- [x] Trace the frontend food-photo upload flow and scan response handling.
- [x] Trace backend `/scan` implementation, Gemini request shape, validation, retries, and error handling.
- [x] Identify why scanning is failing and where API calls are inefficient or wasteful.
- [x] Implement the smallest robust fix across frontend/backend.

## Verification
- [x] Run targeted backend tests or direct scan endpoint checks where possible.
- [x] Run frontend quality checks affected by the scan flow.
- [x] Document any live API verification that cannot be completed locally.

## Review Notes
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed after allowing network access for Next font fetching.
- `python -m compileall backend/app` passed with the bundled Python runtime.
- A live `/scan` request was not run because this workspace has no usable local Python backend runtime with FastAPI deps available to start the service here, and Gemini keys were not validated in this session.
- Root cause fixed: the diet UI now uses the rate-limited server action instead of making direct browser-to-FastAPI scan calls, and the server action now posts the correct multipart `file` payload to `/scan`.
- API efficiency improved: removed temp image storage/base64 JSON path from scan action, added timeout/retry behavior, downscaled images before Gemini, reused the backend HTTP client, constrained Gemini output with a response schema, and defaulted fallbacks toward lower-cost Lite models first.
