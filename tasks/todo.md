# FitLife Goal Plan

## Scope
- [x] Add shared fitness types, body-weight persistence, and server page data loader.
- [x] Add weekly workout plan constants and use them for exercise suggestions.
- [x] Add body-weight server action, progress route, and Supabase migration.
- [x] Add GoalProgressCard, TodayWorkout, RestTimer, and BodyWeightTracker components.
- [x] Wire FitnessShell, routes, nav, logger, logs list, diet page, charts, and settings updates.
- [x] Apply mobile/PWA polish in global CSS, manifest, layout, and Next config.

## Verification
- [x] Run typecheck.
- [x] Run lint.
- [x] Run build when feasible.
- [x] Run diff hygiene check.

## Review Notes
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed after allowing network access for Next font fetching.
- `git diff --check` passed; Git only reported normal LF-to-CRLF working tree warnings.
- The implementation keeps the listed "Do Not Change" files untouched.
