# Priority-Based Rollout Status (2026-04-07)

## P0 (Must Do Before Release)

- [x] Check where Supabase tables are stored for meals and workout logs.
  - `meal_logs`: `supabase/migrations/20260327_add_nutrition_tables.sql`
  - `workout_logs`: referenced in `lib/data/fitnessStore.ts` (existing table expected in Supabase project)
- [x] Create and verify Supabase Storage bucket flow (`temp_uploads`, private).
  - Auto-create with `public: false` in `lib/data/fitnessStore.ts`.
- [x] Validate cleanup flow (discard-on-success and discard-on-failure) in code.
  - Cleanup in `finally` in `app/actions.ts`.
- [x] Run core quality checks.
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- [x] Verify secure key handling in architecture.
  - Keys only accessed in server-side files (`app/actions.ts`, `lib/domain/mealAnalyzer.ts`).

## P1 (Important for Accuracy and UX)

- [x] Functional upload support coded for JPG/PNG/HEIC/HEIF/WEBP.
- [x] Verification prompt behavior implemented.
  - Low-confidence prompt shown.
  - "Yes" saves directly.
  - "No, I'll type it" pre-fills fields without auto-save.
- [x] Regional dish and Indian portion prompting implemented in analyzer prompt.
- [x] Friendly error messages for invalid format and transient processing failures.
- [ ] Live-device validation matrix pending (manual QA still required).
  - Validate at least one mobile browser HEIC/HEIF upload in real run.

## P2 (Hardening)

- [x] Persist full item-level nutrition table.
  - Added `meal_nutrition_items` migration and write path from quick analysis flow.
- [x] Add server-side file validation limits.
  - MIME allowlist + max size (8 MB) in `app/actions.ts`.
- [x] Add retry and timeout strategy.
  - Added retries + backoff + timeout around Gemini calls in `lib/domain/mealAnalyzer.ts`.
- [x] Observability logging.
  - Added logs for Gemini failures and temp upload/delete lifecycle.
- [x] Quota safety basics.
  - Added lightweight in-memory rate limiting for image analysis server action.
- [ ] Provider quota alerts pending (external ops/infrastructure integration not yet configured).

## Release Gate

- [x] All code-side P0 items complete.
- [ ] At least 1 successful end-to-end run per image type (manual verification pending).
- [ ] At least 5 Indian dishes tested and accepted (manual verification pending).
- [ ] No leftover files in `temp_uploads` after full test pass (manual verification pending).
- [x] Build passes with no secret handling regression in code path.

## Notes

- This status reflects repository implementation and automated checks run on 2026-04-07.
- Remaining unchecked items require manual/live environment execution and Supabase dashboard verification.
