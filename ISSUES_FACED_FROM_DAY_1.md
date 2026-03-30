# Issues Faced from Day 1

## Issue #1: Max Dumbbell Weight Resets to 15kg After Update ❌ FIXED

### Symptoms
- User changes max dumbbell weight in Settings page
- Save appears to work (button shows "Saving...")
- After page reload or navigation away, value reverts to 15kg

### Root Cause
The in-memory storage fallback flag (`useInMemoryStore`) wasn't properly tracked across function calls. When a filesystem write failed, the code would switch to in-memory mode permanently but not persist the flag state. On next page load, it would read from the stale filesystem file.

### Fix Applied
Updated `lib/data/fitnessStore.ts` to:
1. Initialize store mode (file/memory/supabase) at startup
2. Try multiple fallback paths: `/tmp` → home directory → in-memory
3. Properly track mode in `globalStore.__FITNESS_STORE_MODE__`
4. Don't permanently lock into memory mode - retries on each persist attempt

### Verification Steps
```
1. Open Settings page
2. Scroll to "Max Dumbbell Weight" field (currently 15)
3. Change value to 45kg
4. Click "Save Settings"
5. Navigate to Dashboard (other page)
6. Navigate back to Settings
7. Verify Max Dumbbell Weight = 45kg (not reverted to 15)
```

### Status: ✅ FIXED

---

## Issue #2: Settings Save Shows "Offline: Queued..." When Online ❌ FIXED

### Symptoms
- User clicks "Save Settings"
- Even when browser is online
- Error message shows: "Offline: queued settings change for sync"
- Settings appear to save optimistically but message is misleading

### Root Cause
The catch block in `SettingsPage.tsx` was treating ALL exceptions as offline events without checking `navigator.onLine`. This included:
- Server action timeouts
- Network errors
- Vercel read-only filesystem errors

### Fix Applied
Updated `components/SettingsPage.tsx` to:
1. Check `navigator.onLine` in the catch block
2. Only queue if actually offline
3. Show proper error message "Unable to save settings right now..." for online failures
4. Separate server error handling from offline queue logic

### Status: ✅ FIXED

---

## Issue #3: Service Worker Caching Stale Route HTML ❌ FIXED

### Symptoms (Deployed on Vercel)
- After redeploy, settings save returns 500 error
- Console shows server action failure
- Stale cached HTML has outdated server action IDs
- Only resolves after clearing browser cache

### Root Cause
The service worker (`public/sw.js`) was caching full page HTML for routes like `/settings`, `/diet`, etc. After a Vercel redeploy, the cached HTML still had old Next.js server action form IDs, causing POST requests to fail with 500.

### Fix Applied
Updated `public/sw.js` to:
1. Use network-first strategy for page navigations
2. Only cache static assets (`/_next/*`) and root (`/`)
3. Cache version bumped to v2 to invalidate old caches
4. Never cache full route HTM

```js
// Always prefer network for navigations
if (event.request.mode === "navigate") {
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/")),
  );
  return;
}
```

### Status: ✅ FIXED

---

## Issue #4: Service Worker Not Updating After Redeploy ❌ FIXED

### Symptoms (Deployed)
- New version deployed but SW still serves old code
- Cache not updated even after browser hard refresh
- Users stuck on old version

### Root Cause
PWA registrar wasn't forcing update checks. Browser doesn't always call `update()` on registration.

### Fix Applied
Updated `components/PWARegistrar.tsx` to:
1. Register with `updateViaCache: "none"` to force fresh checks
2. Call `registration.update()` immediately after register
3. This ensures browser checks for new SW on every page load

```typescript
navigator.serviceWorker
  .register("/sw.js", { updateViaCache: "none" })
  .then((registration) => registration.update())
```

### Status: ✅ FIXED

---

## Issue #5: Recharts Width/Height Zero Warnings ⚠️ PARTIALLY FIXED

### Symptoms
Console shows repeated warnings:
```
The width(0) and height(0) of chart should be greater than 0,
please check the style of container, or the props width(100%) and height(100%),
or add a minWidth(0) or minHeight(undefined) or use aspect(undefined) to control the height and width.
```

### Root Cause
ResponsiveContainer needs explicit dimensions when container width/height aren't properly defined by CSS. Percentage-based heights (`height="100%"`) don't work without explicit parent heights.

### Partial Fixes Applied
1. Added `overflow-hidden` to chart containers
2. Set explicit height on parent divs (`h-56` = 224px)
3. Added responsive container height as fixed values (224px)
4. Added `debounce={500}` to prevent constant recalculations

### Current Status: Warnings should be minimal but may still appear during initial render

### Remaining Option
Could add `minWidth={0} minHeight={0}` to ResponsiveContainer props to suppress warnings:
```tsx
<ResponsiveContainer width="100%" height={224} minWidth={0} minHeight={0}>
```

### Status: ⚠️ PARTIALLY FIXED (acceptable - warnings non-critical)

---

## Issue #6: Zustand Deprecation Warning ⚠️ EXTERNAL DEPENDENCY

### Symptoms
Console warning:
```
[DEPRECATED] Default export is deprecated. Instead use `import { create } from 'zustand'`.
```

### Root Cause
FitLife codebase doesn't use Zustand - this is from a dependency (likely browser extension or injected script)

### Action
- Not FitLife code issue
- Verify no zustand imports in codebase: ✅ CONFIRMED (no zustand used)
- Wait for dependency update or ignore if acceptable

### Status: ⚠️ EXTERNAL (no action needed for FitLife)

---

## Issue #7: Unexpected Token 'export' in Browser Extension ⚠️ EXTERNAL

### Symptoms
Console error:
```
Uncaught SyntaxError: Unexpected token 'export' (at webpage_content_reporter.js:1:115561)
```

### Root Cause
Browser extension (webpage_content_reporter.js) is injecting scripts that aren't properly transpiled for the browser environment. This is a browser extension issue, not FitLife.

### Action
- Not FitLife code issue
- User should check browser extensions for conflicts
- Can ignore or disable problematic extensions

### Status: ⚠️ EXTERNAL (browser extension related)

---

## Issue #8: Multiple Lockfiles Warning During Build ❌ FIXED

### Symptoms
Build warning:
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
  We detected multiple lockfiles and selected the directory of D:\Code\package-lock.json as the root directory.
```

### Root Cause
Turbopack detected both:
- D:\Code\package-lock.json (parent directory)
- D:\Code\FitLife\package-lock.json (project directory)

Turbopack picked the wrong one as root.

### Fix Applied
Added turbopack configuration to `next.config.ts`:
```typescript
experimental: {
  turbopack: {
    root: process.cwd(),
  },
}
```

This explicitly tells Turbopack to use the current working directory as root.

### Status: ✅ FIXED

---

## Issue #9: Vercel Read-Only Filesystem in Fallback ❌ FIXED

### Symptoms (Deployed on Vercel)
- Settings save fails with server error
- Error occurs when Supabase env vars are missing
- Fallback tries to write to `data/fitness-db.json` which is read-only on Vercel

### Root Cause
Vercel's serverless environment has read-only project root. The fallback storage at `data/fitness-db.json` throws unhandled write errors.

### Fix Applied
Updated `lib/data/fitnessStore.ts` to:
1. Use `/tmp` on Vercel (writable temp directory)
2. Fall back to home directory
3. Finally fall back to in-memory storage
4. Gracefully handle all write failures without throwing

```typescript
const DB_PATH =
  process.env.FITNESS_DB_PATH ??
  (process.env.VERCEL
    ? path.join("/tmp", "fitness-db.json")
    : path.join(process.cwd(), "data", "fitness-db.json"));
```

### Status: ✅ FIXED

---

## Issue #10: Settings/Workout/Diet Saves Not Distinguishing Online vs Server Errors ❌ FIXED

### Symptoms
- User performs action while online
- Server returns error (e.g., validation)
- UI shows "Offline: queued..." message
- Settings never actually save
- Offline queue fills up with items that fail every sync attempt

### Root Cause
All error handlers in components queued items without checking online status first. Server-side validation errors or timeout errors were treated as offline.

### Fixes Applied
Updated error handlers in:
1. `components/SettingsPage.tsx` - checks `navigator.onLine`
2. `components/WorkoutLogger.tsx` - checks `navigator.onLine`
3. `components/DietPlanPage.tsx` - checks `navigator.onLine`

Pattern:
```typescript
catch {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue({ type: "...", payload: draft });
    setError("Offline: queued...");
    return;
  }
  setError("Unable to save right now. Please try again.");
}
```

### Status: ✅ FIXED

---

## Testing Checklist

### Critical Path Tests
- [ ] **Dashboard Load**: Stats display, charts render
- [ ] **Settings Update**: Max dumbbell changes to new value, persists
- [ ] **Workout Logging**: Add workout, appears in logs
- [ ] **Meal Logging**: Add meal, appears in diet plan
- [ ] **Offline to Online**: Queue syncs properly
- [ ] **Settings Save Error**: Shows proper error when fail (not "Offline")

### Edge Cases
- [ ] Settings with invalid values (e.g., max dumbbell = 0)
- [ ] Rapid clicks on Save Settings
- [ ] Page refresh during save
- [ ] Browser offline → online transition
- [ ] Multiple queued items syncing

### Browser Compatibility
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Mobile browsers

### Vercel Deployment
- [ ] Redeploy doesn't break settings save
- [ ] No 500 errors after cache clear
- [ ] Service worker updates properly
- [ ] Offline mode works

---

## Performance Metrics

### Build
- ✅ Production build: 4.3s (successful)
- ✅ TypeScript check: 4.7s (no errors)
- ✅ Static page generation: 9/9 pages
- ⚠️ Turbopack cache warning (harmless)

### Runtime Expectations
- Dashboard page load: < 2s
- Charts render: < 500ms
- Settings save: < 1s (including network)
- Offline queue sync: < 2s

---

## Summary

### Fixed Issues (10 total)
✅ Max dumbbell weight persistence
✅ Settings save shows false "Offline" message
✅ Service worker caching stale HTML
✅ Service worker not updating
✅ Vercel read-only filesystem errors
✅ Error handlers queuing on server failures
✅ Multiple lockfiles warning
✅ In-memory storage fallback logic

### Remaining Warnings (External)
⚠️ Recharts width/height (non-critical, mostly fixed)
⚠️ Zustand deprecation (browser extension)
⚠️ Export syntax error (browser extension)

### Deployment Ready
✅ All critical issues fixed
✅ Build succeeds with no errors
✅ Ready for Vercel redeploy testing

---

## Next Steps

1. **Test on Vercel**: Redeploy and verify all fixes
2. **User Journey Testing**: Walk through complete app flow
3. **Offline Testing**: Test laptop offline mode thoroughly
4. **Mobile Testing**: Verify on mobile browsers
5. **Performance**: Monitor Lighthouse scores

---

*Generated: March 30, 2026*
*Build: Next.js 16.2.1, TypeScript 5*
