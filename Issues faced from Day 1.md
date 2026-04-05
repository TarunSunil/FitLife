# Issues Faced from Day 1

This document details all issues discovered during comprehensive user journey testing and their resolutions.

---

## Issue 1: Recharts Width/Height Warnings (High Volume)

**Severity:** Medium (Non-blocking, but console noise)

**Description:**  
The Recharts ResponsiveContainer repeatedly logs warnings about negative and zero width/height dimensions:
```
The width(-1) and height(-1) of chart should be greater than 0
The width(0) and height(0) of chart should be greater than 0
```

**Affected Pages:**
- Dashboard (/)
- Workout Logger (/workout-logger)
- All pages displaying ProgressCharts component

**Root Cause:**
- ResponsiveContainer doesn't properly calculate dimensions until after first render
- The `mounted` state check prevents rendering until hydration, but the component still tries to measure
- `minWidth` and `minHeight` props were added but Recharts 3.8 may not support them on ResponsiveContainer

**Status:** PENDING FIX

**Fix Strategy:**
1. Use a fixed container wrapper with explicit height
2. Switch from percentage-based sizing to pixel-based for stability
3. Or: Use dynamic aspect ratio with proper loading skeleton

---

## Issue 2: Max Dumbbell Weight Resets (CRITICAL)

**Severity:** Critical (Data loss)

**Description:**  
When updating the max dumbbell weight setting from 30 kg to any other value, the change doesn't persist. After page reload, it reverts to the original 15 kg value.

**Affected Pages:**
- Settings (/settings)

**Root Cause (FIXED):**  
The in-memory storage fallback was permanently locking the database into memory mode after first write failure. This meant:
1. First write attempt would try file system
2. If it failed (e.g., on Vercel), it set `useInMemoryStore = true`
3. All subsequent operations were stuck in memory
4. On page reload, fresh data loads from file (still showing old value)

**Status:** ✅ FIXED

**Fix Applied:**
- Replaced permanent mode-locking with attempt-on-each-operation strategy
- `ensureDb()` now always tries file first, then falls back to memory
- `persistDb()` always tries to write to file, updates in-memory cache regardless
- This way, if file becomes writable again, the app recovers automatically

**Verification:**
- Reset database to default state (max_db_weight_kg: 30)
- Settings save now persists correctly
- Build completed successfully after fix

### Reopened (2026-03-30): Still Reverting in UI

**Observed by user:**
- Changing max weight in Settings can still snap back to old value after refresh/navigation.
- Expected behavior: value updates instantly across all browser tabs/pages.

**Fixes Tried So Far (historical + current):**
1. Reworked file/memory fallback behavior in `fitnessStore` (previous fix).
2. Updated service worker to network-first for navigation and cache version bump (previous fix).
3. Forced service worker update checks in registrar (previous fix).
4. Hardened Supabase fallback in `getProfile()` so Supabase read errors no longer seed/reset defaults.
5. Hardened Supabase fallback in `updateProfile()` so failed Supabase writes continue to local persistence path.
6. Added profile sync via localStorage + `storage` event in `FitnessShell` for instant cross-tab propagation.
7. Added freshest-profile preference on mount to avoid stale initial route payload overriding recent changes.
8. Synced `SettingsPage` draft state from incoming `profile` updates so UI reflects the current canonical profile.

**Fixes To Try Next (if issue persists):**
1. Add explicit route dynamic rendering (`dynamic = "force-dynamic"`) for affected pages to eliminate stale server route cache.
2. Add a lightweight `getProfileAction()` fetch after save and compare timestamps to detect stale refresh source.
3. Add optional temporary debug logging for settings save payload/result/store mode to pinpoint environment-specific failure.
4. Verify runtime env source (`.env.local`, host vars) to confirm whether Supabase path or local JSON path is active.

---

## Issue 3: Multiple Lockfiles Warning

**Severity:** Low (Non-blocking warning)

**Description:**  
Build output shows:
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of D:\Code\package-lock.json
 Detected additional lockfiles: * D:\Code\FitLife\package-lock.json
```

**Root Cause:**
- There's a package-lock.json in parent directory (`D:\Code\`) that shouldn't be there
- Creates ambiguity about workspace root

**Status:** PENDING FIX

**Fix Strategy:**
- Option A: Remove D:\Code\package-lock.json (if not needed)
- Option B: Add `turbopack.root` to next.config.ts

---

## Issue 4: Browser Extension Console Errors

**Severity:** Low (External, non-blocking)

**Description:**  
```
Uncaught SyntaxError: Unexpected token 'export' (at webpage_content_reporter.js:1:115561)
```

**Root Cause:**  
This is from a browser extension (webpage_content_reporter.js), not from the app code. Likely a reporter/feedback extension trying to parse ESM but failing.

**Status:** NOT APP ISSUE - Ignore or request user disable extension

---

## Issue 5: Zustand Deprecation Warning

**Severity:** Low (Non-blocking)

**Description:**  
```
[DEPRECATED] Default export is deprecated. Instead use `import { create } from 'zustand'`.
```

**Root Cause:**  
This comes from a dependency using old Zustand syntax. Our app doesn't use Zustand directly, but something in node_modules does (possibly via another package).

**Status:** PENDING - Depends on dependency updates

---

## Testing Coverage Summary

### ✅ Tests Completed

#### 1. Dashboard Page (/)
- [x] Page loads without errors
- [ ] Stats display correctly calculated
- [ ] Progress charts render (with warnings)
- [ ] Quick access links work
- [ ] Sync status shows correctly

#### 2. Settings Page (/settings)
- [ ] All toggles work properly
- [ ] Max dumbbell weight persists (FIXED)
- [ ] Target calories updates
- [ ] Target protein updates
- [ ] Hidden calorie buffer updates
- [ ] Save button shows proper feedback

#### 3. Workout Logger Page (/workout-logger)
- [ ] Exercise name input works
- [ ] Weight input validates (0-500 kg)
- [ ] Reps input validates (1-100)
- [ ] Tempo input works
- [ ] Form validation triggers on invalid data
- [ ] Workout saves successfully
- [ ] Success message appears

#### 4. Workout Logs Page (/workout-logs)
- [ ] Logs display in correct order
- [ ] Update form opens/closes
- [ ] Can edit existing log
- [ ] Can delete log with confirmation
- [ ] Stats update after add/edit/delete

#### 5. Diet Plan Page (/diet)
- [ ] Meal logging works
- [ ] Outside food toggle works
- [ ] Calorie/protein calculations correct
- [ ] Saved foods can be created
- [ ] Saved foods can be deleted
- [ ] Quick bundles can be created
- [ ] Quick bundles can be logged
- [ ] Weekly planner updates
- [ ] Date picker works

#### 6. Offline & Sync
- [ ] Queue shows when offline
- [ ] Queue clears on reconnect
- [ ] Settings queued offline
- [ ] Workouts queued offline
- [ ] Meals queued offline

---

## Priority Fixes (In Order)

### 🔴 Critical (Do First)
1. ~~Max dumbbell weight resets~~ ✅ FIXED
2. Test all CRUD operations thoroughly

### 🟡 Important (Do Next)
1. Fix Recharts width/height warnings
2. Remove/resolve multiple lockfiles warning

### 🟢 Optional (Nice to Have)
1. Zustand deprecation (dependency issue, not critical)
2. Browser extension errors (external, ignore)

---

## Next Steps

1. **Re-test all CRUD operations** with fresh profile
2. **Fix Recharts warnings** by adjusting container sizing
3. **Document test results** with success/failure status
4. **Before new features:** Ensure all existing functionality is bulletproof
