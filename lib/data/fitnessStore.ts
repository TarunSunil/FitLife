import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_PROFILE,
  PROFILE_ID,
  type FitnessDatabase,
  type FitnessProfile,
  type WorkoutLog,
} from "@/lib/types/fitness";
import type {
  MealLog,
  QuickBundle,
  SavedFoodItem,
  WeeklyPlanEntry,
} from "@/lib/types/nutrition";

const DB_PATH =
  process.env.FITNESS_DB_PATH ??
  (process.env.VERCEL
    ? path.join("/tmp", "fitness-db.json")
    : path.join(process.cwd(), "data", "fitness-db.json"));

const globalStore = globalThis as typeof globalThis & {
  __FITNESS_MEMORY_DB__?: FitnessDatabase;
  __FITNESS_STORE_MODE__?: "file" | "memory";
};

let dbInitialized = false;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeProfile(profile: Partial<FitnessProfile> | null | undefined): FitnessProfile {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    id: profile?.id ?? PROFILE_ID,
    updated_at: profile?.updated_at ?? new Date().toISOString(),
  };
}

function normalizeLog(log: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: log.id ?? randomUUID(),
    profile_id: log.profile_id ?? PROFILE_ID,
    exercise: log.exercise ?? "Unknown Exercise",
    weight_kg: log.weight_kg ?? 0,
    reps: log.reps ?? 0,
    tempo: log.tempo ?? "2-0-2",
    performed_at: log.performed_at ?? new Date().toISOString(),
  };
}

function normalizeMealLog(log: Partial<MealLog>): MealLog {
  const calories = log.calories ?? 0;
  const isOutsideFood = log.is_outside_food ?? false;

  return {
    id: log.id ?? randomUUID(),
    profile_id: log.profile_id ?? PROFILE_ID,
    meal_name: log.meal_name ?? "Meal",
    calories,
    protein: log.protein ?? 0,
    is_outside_food: isOutsideFood,
    outside_calories: Math.max(
      0,
      log.outside_calories ?? (isOutsideFood ? calories : 0),
    ),
    consumed_on: log.consumed_on ?? new Date().toISOString().slice(0, 10),
    created_at: log.created_at ?? new Date().toISOString(),
  };
}

function normalizeSavedFoodItem(food: Partial<SavedFoodItem>): SavedFoodItem {
  return {
    id: food.id ?? randomUUID(),
    profile_id: food.profile_id ?? PROFILE_ID,
    name: food.name ?? "Saved Food",
    calories: food.calories ?? 0,
    protein: food.protein ?? 0,
    is_outside_food: food.is_outside_food ?? false,
    created_at: food.created_at ?? new Date().toISOString(),
    updated_at: food.updated_at ?? new Date().toISOString(),
  };
}

function normalizeQuickBundle(bundle: Partial<QuickBundle>): QuickBundle {
  return {
    id: bundle.id ?? randomUUID(),
    profile_id: bundle.profile_id ?? PROFILE_ID,
    name: bundle.name ?? "Quick Bundle",
    item_ids: Array.isArray(bundle.item_ids) ? bundle.item_ids : [],
    created_at: bundle.created_at ?? new Date().toISOString(),
    updated_at: bundle.updated_at ?? new Date().toISOString(),
  };
}

function normalizePlanEntry(entry: Partial<WeeklyPlanEntry>): WeeklyPlanEntry {
  return {
    id: entry.id ?? randomUUID(),
    profile_id: entry.profile_id ?? PROFILE_ID,
    day: entry.day ?? "Monday",
    slot: entry.slot ?? "Breakfast",
    meal_name: entry.meal_name ?? "",
    ingredients: Array.isArray(entry.ingredients) ? entry.ingredients : [],
    updated_at: entry.updated_at ?? new Date().toISOString(),
  };
}

function createSeededDb(): FitnessDatabase {
  return {
    profiles: [DEFAULT_PROFILE],
    workout_logs: [],
    meal_logs: [],
    weekly_plan: [],
    saved_foods: [],
    quick_bundles: [],
  };
}

function getMemoryDb(): FitnessDatabase {
  if (!globalStore.__FITNESS_MEMORY_DB__) {
    globalStore.__FITNESS_MEMORY_DB__ = createSeededDb();
  }

  return globalStore.__FITNESS_MEMORY_DB__;
}

function setMemoryDb(db: FitnessDatabase) {
  globalStore.__FITNESS_MEMORY_DB__ = db;
}

async function ensureDb(): Promise<FitnessDatabase> {
  try {
    const content = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<FitnessDatabase>;

    const normalized: FitnessDatabase = {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      workout_logs: Array.isArray(parsed.workout_logs) ? parsed.workout_logs : [],
      meal_logs: Array.isArray(parsed.meal_logs) ? parsed.meal_logs : [],
      weekly_plan: Array.isArray(parsed.weekly_plan) ? parsed.weekly_plan : [],
      saved_foods: Array.isArray(parsed.saved_foods) ? parsed.saved_foods : [],
      quick_bundles: Array.isArray(parsed.quick_bundles) ? parsed.quick_bundles : [],
    };

    if (!normalized.profiles.length) {
      normalized.profiles.push(DEFAULT_PROFILE);
      await writeFile(DB_PATH, JSON.stringify(normalized, null, 2), "utf8");
    }

    globalStore.__FITNESS_STORE_MODE__ = "file";
    dbInitialized = true;
    return normalized;
  } catch {
    // Try to create new database file
    const seededDb = createSeededDb();

    try {
      await mkdir(path.dirname(DB_PATH), { recursive: true });
      await writeFile(DB_PATH, JSON.stringify(seededDb, null, 2), "utf8");
      globalStore.__FITNESS_STORE_MODE__ = "file";
      dbInitialized = true;
      return seededDb;
    } catch {
      // Fallback to memory storage, but always try file first on next init
      globalStore.__FITNESS_STORE_MODE__ = "memory";
      setMemoryDb(seededDb);
      return getMemoryDb();
    }
  }
}

async function persistDb(db: FitnessDatabase) {
  // Always update in-memory cache
  setMemoryDb(db);

  // Try to persist to file
  try {
    await mkdir(path.dirname(DB_PATH), { recursive: true });
    await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    globalStore.__FITNESS_STORE_MODE__ = "file";
  } catch {
    // If file write fails, stay in memory but don't crash
    globalStore.__FITNESS_STORE_MODE__ = "memory";
  }
}

export async function getProfile(): Promise<FitnessProfile> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", PROFILE_ID)
      .maybeSingle();

    if (!error && data) {
      return normalizeProfile(data as Partial<FitnessProfile>);
    }

    const seededProfile = normalizeProfile(DEFAULT_PROFILE);
    await supabase.from("profiles").upsert(seededProfile);
    return seededProfile;
  }

  const db = await ensureDb();
  const profile = db.profiles.find((item) => item.id === PROFILE_ID);

  if (profile) {
    const normalizedProfile = normalizeProfile(profile);

    if (profile.hidden_calorie_buffer_percent === undefined) {
      db.profiles = db.profiles.filter((item) => item.id !== PROFILE_ID);
      db.profiles.push(normalizedProfile);
      await persistDb(db);
    }

    return normalizedProfile;
  }

  db.profiles.push(DEFAULT_PROFILE);
  await persistDb(db);
  return DEFAULT_PROFILE;
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .order("performed_at", { ascending: true });

    if (!error && data) {
      return (data as Partial<WorkoutLog>[]).map((log) => normalizeLog(log));
    }

    return [];
  }

  const db = await ensureDb();
  return db.workout_logs.map((log) => normalizeLog(log));
}

export async function updateWorkoutLog(
  logId: string,
  payload: Partial<Pick<WorkoutLog, "exercise" | "weight_kg" | "reps" | "tempo">>,
): Promise<WorkoutLog | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("workout_logs")
      .update(payload)
      .eq("id", logId)
      .eq("profile_id", PROFILE_ID)
      .select()
      .maybeSingle();

    if (!error && data) {
      return normalizeLog(data as Partial<WorkoutLog>);
    }

    return null;
  }

  const db = await ensureDb();
  const index = db.workout_logs.findIndex((log) => log.id === logId);

  if (index === -1) {
    return null;
  }

  const current = db.workout_logs[index];
  const updated = normalizeLog({
    ...current,
    ...payload,
    id: current.id,
    profile_id: current.profile_id,
    performed_at: current.performed_at,
  });

  db.workout_logs[index] = updated;
  await persistDb(db);

  return updated;
}

export async function deleteWorkoutLog(logId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("id", logId)
      .eq("profile_id", PROFILE_ID);

    return !error;
  }

  const db = await ensureDb();
  const before = db.workout_logs.length;
  db.workout_logs = db.workout_logs.filter((log) => log.id !== logId);

  if (before === db.workout_logs.length) {
    return false;
  }

  await persistDb(db);
  return true;
}

export async function updateProfile(
  partial: Partial<Omit<FitnessProfile, "id" | "updated_at">>,
): Promise<FitnessProfile> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const existing = await getProfile();
    const updated: FitnessProfile = {
      ...existing,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(updated)
      .select()
      .single();

    if (!error && data) {
      return normalizeProfile(data as Partial<FitnessProfile>);
    }

    return updated;
  }

  const db = await ensureDb();
  const current = db.profiles.find((profile) => profile.id === PROFILE_ID) ?? DEFAULT_PROFILE;

  const updated: FitnessProfile = {
    ...current,
    ...partial,
    updated_at: new Date().toISOString(),
  };

  db.profiles = db.profiles.filter((profile) => profile.id !== PROFILE_ID);
  db.profiles.push(updated);
  await persistDb(db);
  return updated;
}

export async function insertWorkoutLog(
  payload: Omit<WorkoutLog, "id" | "profile_id" | "performed_at">,
): Promise<WorkoutLog> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const newLog: WorkoutLog = {
      id: randomUUID(),
      profile_id: PROFILE_ID,
      exercise: payload.exercise,
      weight_kg: payload.weight_kg,
      reps: payload.reps,
      tempo: payload.tempo,
      performed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workout_logs")
      .insert(newLog)
      .select()
      .single();

    if (!error && data) {
      return normalizeLog(data as Partial<WorkoutLog>);
    }

    return newLog;
  }

  const db = await ensureDb();

  const newLog: WorkoutLog = {
    id: randomUUID(),
    profile_id: PROFILE_ID,
    exercise: payload.exercise,
    weight_kg: payload.weight_kg,
    reps: payload.reps,
    tempo: payload.tempo,
    performed_at: new Date().toISOString(),
  };

  db.workout_logs.push(newLog);
  await persistDb(db);
  return newLog;
}

export async function getMealLogs(): Promise<MealLog[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as Partial<MealLog>[]).map((log) => normalizeMealLog(log));
    }

    return [];
  }

  const db = await ensureDb();
  return db.meal_logs.map((log) => normalizeMealLog(log));
}

export async function insertMealLog(
  payload: Omit<MealLog, "id" | "profile_id" | "created_at">,
): Promise<MealLog> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const newLog = normalizeMealLog({
      ...payload,
      profile_id: PROFILE_ID,
    });

    const { data, error } = await supabase
      .from("meal_logs")
      .insert(newLog)
      .select()
      .single();

    if (!error && data) {
      return normalizeMealLog(data as Partial<MealLog>);
    }

    return newLog;
  }

  const db = await ensureDb();
  const newLog = normalizeMealLog({
    ...payload,
    profile_id: PROFILE_ID,
  });

  db.meal_logs.push(newLog);
  await persistDb(db);

  return newLog;
}

export async function deleteMealLog(mealLogId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", mealLogId)
      .eq("profile_id", PROFILE_ID);

    return !error;
  }

  const db = await ensureDb();
  const before = db.meal_logs.length;
  db.meal_logs = db.meal_logs.filter((log) => log.id !== mealLogId);

  if (before === db.meal_logs.length) {
    return false;
  }

  await persistDb(db);
  return true;
}

export async function getWeeklyPlan(): Promise<WeeklyPlanEntry[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("weekly_plan")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .order("day", { ascending: true });

    if (!error && data) {
      return (data as Partial<WeeklyPlanEntry>[]).map((entry) => normalizePlanEntry(entry));
    }

    return [];
  }

  const db = await ensureDb();
  return db.weekly_plan.map((entry) => normalizePlanEntry(entry));
}

export async function getSavedFoods(): Promise<SavedFoodItem[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("saved_foods")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as Partial<SavedFoodItem>[]).map((food) => normalizeSavedFoodItem(food));
    }

    return [];
  }

  const db = await ensureDb();
  return db.saved_foods
    .map((food) => normalizeSavedFoodItem(food))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getSavedFoodsByIds(itemIds: string[]): Promise<SavedFoodItem[]> {
  if (!itemIds.length) {
    return [];
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("saved_foods")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .in("id", itemIds);

    if (!error && data) {
      const foods = (data as Partial<SavedFoodItem>[]).map((food) => normalizeSavedFoodItem(food));
      return itemIds
        .map((id) => foods.find((food) => food.id === id))
        .filter((food): food is SavedFoodItem => Boolean(food));
    }

    return [];
  }

  const db = await ensureDb();
  const foods = db.saved_foods.map((food) => normalizeSavedFoodItem(food));
  return itemIds
    .map((id) => foods.find((food) => food.id === id))
    .filter((food): food is SavedFoodItem => Boolean(food));
}

export async function insertSavedFood(
  payload: Omit<SavedFoodItem, "id" | "profile_id" | "created_at" | "updated_at">,
): Promise<SavedFoodItem> {
  const supabase = getSupabaseClient();
  const newFood = normalizeSavedFoodItem({
    ...payload,
    profile_id: PROFILE_ID,
  });

  if (supabase) {
    const { data, error } = await supabase
      .from("saved_foods")
      .insert(newFood)
      .select()
      .single();

    if (!error && data) {
      return normalizeSavedFoodItem(data as Partial<SavedFoodItem>);
    }

    return newFood;
  }

  const db = await ensureDb();
  db.saved_foods.push(newFood);
  await persistDb(db);
  return newFood;
}

export async function deleteSavedFood(savedFoodId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from("saved_foods")
      .delete()
      .eq("id", savedFoodId)
      .eq("profile_id", PROFILE_ID);

    if (error) {
      return false;
    }

    await supabase
      .from("quick_bundles")
      .delete()
      .eq("profile_id", PROFILE_ID)
      .contains("item_ids", [savedFoodId]);

    return true;
  }

  const db = await ensureDb();
  const before = db.saved_foods.length;
  db.saved_foods = db.saved_foods.filter((food) => food.id !== savedFoodId);

  if (before === db.saved_foods.length) {
    return false;
  }

  db.quick_bundles = db.quick_bundles.filter((bundle) => !bundle.item_ids.includes(savedFoodId));
  await persistDb(db);
  return true;
}

export async function getQuickBundles(): Promise<QuickBundle[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("quick_bundles")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as Partial<QuickBundle>[]).map((bundle) => normalizeQuickBundle(bundle));
    }

    return [];
  }

  const db = await ensureDb();
  return db.quick_bundles
    .map((bundle) => normalizeQuickBundle(bundle))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getQuickBundleById(bundleId: string): Promise<QuickBundle | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("quick_bundles")
      .select("*")
      .eq("profile_id", PROFILE_ID)
      .eq("id", bundleId)
      .maybeSingle();

    if (!error && data) {
      return normalizeQuickBundle(data as Partial<QuickBundle>);
    }

    return null;
  }

  const db = await ensureDb();
  const bundle = db.quick_bundles.find((item) => item.id === bundleId);
  return bundle ? normalizeQuickBundle(bundle) : null;
}

export async function insertQuickBundle(
  payload: Omit<QuickBundle, "id" | "profile_id" | "created_at" | "updated_at">,
): Promise<QuickBundle> {
  const supabase = getSupabaseClient();
  const newBundle = normalizeQuickBundle({
    ...payload,
    profile_id: PROFILE_ID,
    item_ids: [...new Set(payload.item_ids)],
  });

  if (supabase) {
    const { data, error } = await supabase
      .from("quick_bundles")
      .insert(newBundle)
      .select()
      .single();

    if (!error && data) {
      return normalizeQuickBundle(data as Partial<QuickBundle>);
    }

    return newBundle;
  }

  const db = await ensureDb();
  db.quick_bundles.push(newBundle);
  await persistDb(db);
  return newBundle;
}

export async function deleteQuickBundle(bundleId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from("quick_bundles")
      .delete()
      .eq("id", bundleId)
      .eq("profile_id", PROFILE_ID);

    return !error;
  }

  const db = await ensureDb();
  const before = db.quick_bundles.length;
  db.quick_bundles = db.quick_bundles.filter((bundle) => bundle.id !== bundleId);

  if (before === db.quick_bundles.length) {
    return false;
  }

  await persistDb(db);
  return true;
}

export async function upsertWeeklyPlanEntry(
  payload: Omit<WeeklyPlanEntry, "id" | "profile_id" | "updated_at">,
): Promise<WeeklyPlanEntry> {
  const normalized = normalizePlanEntry({
    ...payload,
    profile_id: PROFILE_ID,
    updated_at: new Date().toISOString(),
  });

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("weekly_plan")
      .upsert(
        {
          ...normalized,
          id: `${PROFILE_ID}-${payload.day}-${payload.slot}`,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (!error && data) {
      return normalizePlanEntry(data as Partial<WeeklyPlanEntry>);
    }

    return {
      ...normalized,
      id: `${PROFILE_ID}-${payload.day}-${payload.slot}`,
    };
  }

  const db = await ensureDb();
  const stableId = `${PROFILE_ID}-${payload.day}-${payload.slot}`;

  const index = db.weekly_plan.findIndex((entry) => entry.id === stableId);
  const entry: WeeklyPlanEntry = {
    ...normalized,
    id: stableId,
  };

  if (index >= 0) {
    db.weekly_plan[index] = entry;
  } else {
    db.weekly_plan.push(entry);
  }

  await persistDb(db);
  return entry;
}
