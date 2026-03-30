# FitLife Features Comprehensive Test Plan

## Test Scenarios

### 1. Dashboard Page
- [ ] Page loads successfully
- [ ] Stats panel displays correctly:
  - [ ] Workout Logs count
  - [ ] Total Volume calculation
  - [ ] Calories Target from settings
  - [ ] Protein Target from settings
  - [ ] Meal Logs count
- [ ] Progress Charts render without console errors
  - [ ] Training Volume chart displays
  - [ ] Calories Intake chart displays
  - [ ] Protein Intake chart displays
- [ ] Quick Access links work (Workout Logs, Diet Plan, Settings)
- [ ] Sync status displays correctly
- [ ] Online/Offline indicator works

### 2. Settings Page
- [ ] All toggles can be toggled:
  - [ ] Squat Rack
  - [ ] Pull-up Bar
  - [ ] Bench
  - [ ] Fridge
  - [ ] Kettle
- [ ] Number inputs work:
  - [ ] Target Calories (900-7000)
  - [ ] Target Protein (30-400g)
  - [ ] Max Dumbbell Weight **KEY TEST** (1-200kg)
- [ ] Hidden Calorie Buffer slider works (0-30%)
- [ ] Shopping List Context updates dynamically
- [ ] Save Settings button works
- [ ] Settings persist after page reload
- [ ] Error handling for invalid values
- [ ] Optimistic UI updates before server response

### 3. Workout Logger Page
- [ ] Exercise input accepts text (2-80 chars)
- [ ] Weight input validates (0-500 kg)
- [ ] Reps input validates (1-100)
- [ ] Tempo input validates (3-20 chars)
- [ ] Add Workout button queues/saves
- [ ] Workout appears in progress chart
- [ ] Tempo priority mode activates when needed
- [ ] Error messages display for invalid inputs
- [ ] Offline queuing works

### 4. Workout Logs Page
- [ ] List displays all workouts
- [ ] Edit button opens inline editor
- [ ] Update functionality works
- [ ] Delete button removes workout
- [ ] Logs persist after reload
- [ ] Offline queuing for edits/deletes

### 5. Diet Plan Page
- [ ] Add Meal section:
  - [ ] Meal name input (2-80 chars)
  - [ ] Calories input (0-3000)
  - [ ] Protein input (0-250g)
  - [ ] Outside Food toggle
  - [ ] Outside Calories calculation
  - [ ] Date picker works
  - [ ] Add Meal button saves
- [ ] Add Saved Food section:
  - [ ] Food name, calories, protein inputs
  - [ ] Outside Food toggle
  - [ ] Add Saved Food button works
  - [ ] Meals appear in quick selection
- [ ] Quick Bundle creation:
  - [ ] Add items from saved foods
  - [ ] Bundle name input
  - [ ] Create bundle button
- [ ] Quick Selection/Logging:
  - [ ] Select items/bundles
  - [ ] Log to date
  - [ ] Quick selection/bundle log works
- [ ] Weekly Planner:
  - [ ] Select day and meal slot
  - [ ] Enter meal name and ingredients
  - [ ] Update button persists plan
- [ ] Totals calculation:
  - [ ] Daily calories correct
  - [ ] Daily protein correct
  - [ ] Target indicators work
- [ ] Offline queuing for all operations

### 6. Offline Behavior
- [ ] Offline indicator shows when disconnected
- [ ] Queued changes message appears
- [ ] Settings changes queue properly
- [ ] Workout logs queue properly
- [ ] Meal logs queue properly
- [ ] Queue syncs when connection restored
- [ ] Error messages for failed syncs

### 7. PWA Features
- [ ] Service Worker registers
- [ ] App works offline with cached assets
- [ ] Navigation works while offline
- [ ] Static routes cached appropriately
- [ ] No stale page issue after redeploy

### 8. Navigation
- [ ] Top nav visible on desktop
- [ ] Bottom nav visible on mobile
- [ ] Active links highlighted correctly
- [ ] Links navigate properly
- [ ] Page loads show correct data

### 9. Console/Browser Errors
- [ ] No "Unexpected token 'export'" errors
- [ ] No Zustand deprecation warnings
- [ ] No Recharts width/height warnings (0 warnings acceptable)
- [ ] No 500 errors on settings save
- [ ] No network failures on Vercel deploy

### 10. Performance
- [ ] Dashboard loads in < 2 seconds
- [ ] Charts render without lag
- [ ] Transitions are smooth
- [ ] No layout shift during hydration
- [ ] Mobile responsive and functional

## Test Priorities
1. **Critical**: Max dumbbell weight persistence (Issue #1)
2. **Critical**: Settings save doesn't show false "Offline" message
3. **High**: All data persists across page reloads
4. **High**: Offline queue works correctly
5. **Medium**: Console errors cleaned up
6. **Medium**: Performance acceptable
7. **Low**: UI/UX polish

## Known Issues Before Testing
- Multiple lockfiles warning (fixed in next.config.ts)
- Recharts width/height warnings (partially addressed)
- Zustand deprecation warning (dependency issue)
- Browser extension export error (external)
