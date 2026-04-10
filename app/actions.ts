"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  deleteQuickBundle,
  deleteSavedFood,
  deleteMealLog,
  deleteWorkoutLog,
  getQuickBundleById,
  getSavedFoodsByIds,
  insertQuickBundle,
  insertMealNutritionItems,
  insertSavedFood,
  insertMealLog,
  insertWorkoutLog,
  updateProfile,
  updateWorkoutLog,
  upsertWeeklyPlanEntry,
  uploadTempImage,
  deleteTempImage,
} from "@/lib/data/fitnessStore";
import { isTempoRequired } from "@/lib/domain/profileRules";
import type { FitnessProfile, WorkoutLog } from "@/lib/types/fitness";
import type {
  AnalyzedNutritionItem,
  MealLog,
  QuickBundle,
  SavedFoodItem,
  WeeklyPlanEntry,
} from "@/lib/types/nutrition";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ANALYSIS_RATE_WINDOW_MS = 60_000;
const ANALYSIS_RATE_LIMIT = 10;

const globalRateStore = globalThis as typeof globalThis & {
  __MEAL_ANALYSIS_RATE__?: { windowStart: number; count: number };
};

function hitMealAnalysisRateLimit(): boolean {
  const now = Date.now();
  const existing = globalRateStore.__MEAL_ANALYSIS_RATE__;

  if (!existing || now - existing.windowStart >= ANALYSIS_RATE_WINDOW_MS) {
    globalRateStore.__MEAL_ANALYSIS_RATE__ = {
      windowStart: now,
      count: 1,
    };

    return false;
  }

  if (existing.count >= ANALYSIS_RATE_LIMIT) {
    return true;
  }

  existing.count += 1;
  return false;
}

const profileSchema = z.object({
  has_squat_rack: z.boolean(),
  has_pullup_bar: z.boolean(),
  has_bench: z.boolean(),
  has_fridge: z.boolean(),
  has_kettle: z.boolean(),
  max_db_weight_kg: z.number().min(1).max(200),
  target_calories: z.number().min(900).max(7000),
  target_protein: z.number().min(30).max(400),
  hidden_calorie_buffer_percent: z.number().min(0).max(30),
});

const workoutSchema = z.object({
  exercise: z.string().min(2).max(80),
  weight_kg: z.number().min(0).max(500),
  reps: z.number().min(1).max(100),
  tempo: z.string().min(3).max(20),
});

const workoutUpdateSchema = z.object({
  id: z.string().min(1),
  exercise: z.string().min(2).max(80),
  weight_kg: z.number().min(0).max(500),
  reps: z.number().min(1).max(100),
  tempo: z.string().min(3).max(20),
});

const idSchema = z.string().min(1);

const mealSchema = z.object({
  meal_name: z.string().min(2).max(80),
  calories: z.number().min(0).max(3000),
  protein: z.number().min(0).max(250),
  ingredients: z.array(z.string().min(1).max(80)).max(30).optional(),
  is_outside_food: z.boolean().default(false),
  outside_calories: z.number().min(0).max(5000).optional(),
  consumed_on: z.string().min(10).max(10),
  nutrition_items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        calories: z.number().min(0).max(3000),
        protein: z.number().min(0).max(500),
        carbs: z.number().min(0).max(1000),
        fats: z.number().min(0).max(500),
      }),
    )
    .max(25)
    .optional(),
});

const savedFoodSchema = z.object({
  name: z.string().min(2).max(80),
  calories: z.number().min(0).max(3000),
  protein: z.number().min(0).max(250),
  is_outside_food: z.boolean().default(false),
});

const quickBundleSchema = z.object({
  name: z.string().min(2).max(80),
  item_ids: z.array(z.string().min(1)).min(1).max(20),
});

const quickSelectionLogSchema = z.object({
  item_ids: z.array(z.string().min(1)).min(1).max(20),
  consumed_on: z.string().min(10).max(10),
  bundle_name: z.string().max(80).optional(),
});

const quickBundleLogSchema = z.object({
  bundle_id: z.string().min(1),
  consumed_on: z.string().min(10).max(10),
});

const weeklyPlanSchema = z.object({
  day: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  meal_name: z.string().max(80),
  calories: z.number().min(0).max(5000).default(0),
  protein: z.number().min(0).max(500).default(0),
  ingredients: z.array(z.string().min(1).max(50)).max(20),
});

const moveMealToWeeklyPlanSchema = z.object({
  meal_log_id: z.string().min(1),
  day: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  meal_name: z.string().min(2).max(80),
  calories: z.number().min(0).max(5000),
  protein: z.number().min(0).max(500),
  ingredients: z.array(z.string().min(1).max(50)).max(20).optional(),
});

export type SettingsActionResult = {
  ok: boolean;
  profile?: FitnessProfile;
  error?: string;
};

export type WorkoutActionResult = {
  ok: boolean;
  log?: WorkoutLog;
  tempoRequired?: boolean;
  error?: string;
};

export type GenericMutationResult = {
  ok: boolean;
  error?: string;
};

export type MealActionResult = {
  ok: boolean;
  meal?: MealLog;
  error?: string;
};

export type WeeklyPlanActionResult = {
  ok: boolean;
  entry?: WeeklyPlanEntry;
  error?: string;
};

export type MoveMealToWeeklyPlanActionResult = {
  ok: boolean;
  entry?: WeeklyPlanEntry;
  error?: string;
};

export type SavedFoodActionResult = {
  ok: boolean;
  savedFood?: SavedFoodItem;
  error?: string;
};

export type QuickBundleActionResult = {
  ok: boolean;
  bundle?: QuickBundle;
  error?: string;
};

export type QuickBundleLogActionResult = {
  ok: boolean;
  meal?: MealLog;
  error?: string;
};

export type AnalyzeMealResult = {
  ok: boolean;
  error?: string;
  data?: {
    mealName: string;
    calories: number;
    protein: number;
    ingredients: string;
    confidence: "High" | "Low";
    nutritionItems: AnalyzedNutritionItem[];
  };
};

export async function analyzeMealImageAction(formData: FormData): Promise<AnalyzeMealResult> {
  const file = formData.get("image") as File | null;
  if (!file) return { ok: false, error: "No image file provided" };

  if (hitMealAnalysisRateLimit()) {
    return {
      ok: false,
      error: "Too many analysis requests. Please wait a minute and try again.",
    };
  }

  const mimeType = file.type;
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return { ok: false, error: "Unsupported image format" };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: "Image is too large. Please upload an image up to 8 MB.",
    };
  }

  const fileId = crypto.randomUUID() + "-" + file.name;
  let isUploaded = false;

  try {
    // 1. Storage - Upload to temp directory
    const uploadRes = await uploadTempImage(file, fileId);
    if (uploadRes) isUploaded = true;
    else {
      console.error("[meal-analyzer] temp upload failed before AI run", { fileId, mimeType, size: file.size });
    }

    // 2. AI Pipeline
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Dynamic import to avoid bloating client builds
    const { analyzeMealWithAIs } = await import("@/lib/domain/mealAnalyzer");
    const result = await analyzeMealWithAIs(base64, mimeType);

    console.log("[meal-analyzer] analysis success", {
      fileId,
      confidence: result.confidence,
      mealName: result.mealName,
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error("[meal-analyzer] analysis failure", {
      fileId,
      mimeType,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: error instanceof Error ? error.message : "AI Analysis failed" };
  } finally {
    // 3. Cleanup (Discard on Success/Failure)
    if (isUploaded) {
      const deleted = await deleteTempImage(fileId);
      if (!deleted) {
        console.error("[meal-analyzer] temp cleanup failed", { fileId });
      }
    }
  }
}

export async function updateSettingsAction(
  payload: z.infer<typeof profileSchema>,
): Promise<SettingsActionResult> {
  const parsed = profileSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid settings payload",
    };
  }

  const profile = await updateProfile(parsed.data);

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/workout-logger");
  revalidatePath("/workout-logs");
  revalidatePath("/workouts");
  revalidatePath("/diet");

  return { ok: true, profile };
}

export async function addWorkoutLogAction(
  payload: z.infer<typeof workoutSchema>,
  profile: z.infer<typeof profileSchema>,
): Promise<WorkoutActionResult> {
  const parsed = workoutSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid workout payload",
    };
  }

  let log: WorkoutLog;

  try {
    log = await insertWorkoutLog(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save workout log",
    };
  }

  revalidatePath("/");
  revalidatePath("/workout-logger");
  revalidatePath("/workouts");
  revalidatePath("/workout-logs");

  return {
    ok: true,
    log,
    tempoRequired: isTempoRequired(profile, parsed.data.weight_kg),
  };
}

export async function updateWorkoutLogAction(
  payload: z.infer<typeof workoutUpdateSchema>,
): Promise<WorkoutActionResult> {
  const parsed = workoutUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid workout update payload" };
  }

  const updated = await updateWorkoutLog(parsed.data.id, {
    exercise: parsed.data.exercise,
    reps: parsed.data.reps,
    tempo: parsed.data.tempo,
    weight_kg: parsed.data.weight_kg,
  });

  if (!updated) {
    return { ok: false, error: "Workout log not found" };
  }

  revalidatePath("/");
  revalidatePath("/workout-logger");
  revalidatePath("/workouts");
  revalidatePath("/workout-logs");

  return { ok: true, log: updated };
}

export async function deleteWorkoutLogAction(logId: string): Promise<GenericMutationResult> {
  const parsed = idSchema.safeParse(logId);

  if (!parsed.success) {
    return { ok: false, error: "Invalid workout log id" };
  }

  const deleted = await deleteWorkoutLog(parsed.data);

  if (!deleted) {
    return { ok: false, error: "Workout log not found" };
  }

  revalidatePath("/");
  revalidatePath("/workout-logger");
  revalidatePath("/workouts");
  revalidatePath("/workout-logs");

  return { ok: true };
}

export async function addMealLogAction(
  payload: z.infer<typeof mealSchema>,
): Promise<MealActionResult> {
  const parsed = mealSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid meal payload" };
  }

  const outsideCalories =
    parsed.data.outside_calories ?? (parsed.data.is_outside_food ? parsed.data.calories : 0);

  let meal: MealLog;

  try {
    meal = await insertMealLog({
      meal_name: parsed.data.meal_name,
      calories: parsed.data.calories,
      protein: parsed.data.protein,
      ingredients: parsed.data.ingredients ?? [],
      is_outside_food: parsed.data.is_outside_food,
      consumed_on: parsed.data.consumed_on,
      outside_calories: outsideCalories,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save meal",
    };
  }

  if (meal && parsed.data.nutrition_items?.length) {
    await insertMealNutritionItems(meal.id, parsed.data.nutrition_items);
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true, meal };
}

export async function addSavedFoodAction(
  payload: z.infer<typeof savedFoodSchema>,
): Promise<SavedFoodActionResult> {
  const parsed = savedFoodSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid saved food payload" };
  }

  let savedFood: SavedFoodItem;

  try {
    savedFood = await insertSavedFood(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save saved food",
    };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true, savedFood };
}

export async function deleteSavedFoodAction(savedFoodId: string): Promise<GenericMutationResult> {
  const parsed = idSchema.safeParse(savedFoodId);

  if (!parsed.success) {
    return { ok: false, error: "Invalid saved food id" };
  }

  const deleted = await deleteSavedFood(parsed.data);

  if (!deleted) {
    return { ok: false, error: "Saved food not found" };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true };
}

export async function addQuickBundleAction(
  payload: z.infer<typeof quickBundleSchema>,
): Promise<QuickBundleActionResult> {
  const parsed = quickBundleSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid quick bundle payload" };
  }

  let bundle: QuickBundle;

  try {
    bundle = await insertQuickBundle({
      name: parsed.data.name,
      item_ids: [...new Set(parsed.data.item_ids)],
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save quick bundle",
    };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true, bundle };
}

export async function deleteQuickBundleAction(bundleId: string): Promise<GenericMutationResult> {
  const parsed = idSchema.safeParse(bundleId);

  if (!parsed.success) {
    return { ok: false, error: "Invalid quick bundle id" };
  }

  const deleted = await deleteQuickBundle(parsed.data);

  if (!deleted) {
    return { ok: false, error: "Quick bundle not found" };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true };
}

export async function logQuickSelectionAction(
  payload: z.infer<typeof quickSelectionLogSchema>,
): Promise<QuickBundleLogActionResult> {
  const parsed = quickSelectionLogSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid quick bundle log payload" };
  }

  const foods = await getSavedFoodsByIds(parsed.data.item_ids);

  if (!foods.length) {
    return { ok: false, error: "No saved foods found for selection" };
  }

  const calories = foods.reduce((sum, food) => sum + food.calories, 0);
  const protein = foods.reduce((sum, food) => sum + food.protein, 0);
  const outsideCalories = foods
    .filter((food) => food.is_outside_food)
    .reduce((sum, food) => sum + food.calories, 0);

  const mealName = parsed.data.bundle_name?.trim().length
    ? parsed.data.bundle_name.trim()
    : `Quick Bundle (${foods.length} items)`;

  const meal = await insertMealLog({
    meal_name: mealName,
    calories,
    protein,
    ingredients: foods.map((food) => food.name),
    consumed_on: parsed.data.consumed_on,
    is_outside_food: outsideCalories > 0,
    outside_calories: outsideCalories,
  });

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true, meal };
}

export async function logQuickBundleAction(
  payload: z.infer<typeof quickBundleLogSchema>,
): Promise<QuickBundleLogActionResult> {
  const parsed = quickBundleLogSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid quick bundle log payload" };
  }

  const bundle = await getQuickBundleById(parsed.data.bundle_id);

  if (!bundle) {
    return { ok: false, error: "Quick bundle not found" };
  }

  return logQuickSelectionAction({
    item_ids: bundle.item_ids,
    consumed_on: parsed.data.consumed_on,
    bundle_name: bundle.name,
  });
}

export async function deleteMealLogAction(mealLogId: string): Promise<GenericMutationResult> {
  const parsed = idSchema.safeParse(mealLogId);

  if (!parsed.success) {
    return { ok: false, error: "Invalid meal log id" };
  }

  const deleted = await deleteMealLog(parsed.data);

  if (!deleted) {
    return { ok: false, error: "Meal log not found" };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return { ok: true };
}

export async function upsertWeeklyPlanEntryAction(
  payload: z.infer<typeof weeklyPlanSchema>,
): Promise<WeeklyPlanActionResult> {
  const parsed = weeklyPlanSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid weekly planner payload" };
  }

  const entry = await upsertWeeklyPlanEntry(parsed.data);

  revalidatePath("/");
  revalidatePath("/diet");

  return {
    ok: true,
    entry,
  };
}

export async function moveMealToWeeklyPlanAction(
  payload: z.infer<typeof moveMealToWeeklyPlanSchema>,
): Promise<MoveMealToWeeklyPlanActionResult> {
  const parsed = moveMealToWeeklyPlanSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, error: "Invalid staged meal move payload" };
  }

  const { meal_log_id, day, slot, meal_name, calories, protein, ingredients } = parsed.data;

  let entry: WeeklyPlanEntry;

  try {
    entry = await upsertWeeklyPlanEntry({
      day,
      slot,
      meal_name,
      calories,
      protein,
      ingredients: ingredients ?? [],
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update weekly planner",
    };
  }

  const deleted = await deleteMealLog(meal_log_id);

  if (!deleted) {
    return {
      ok: false,
      error: "Meal moved to planner but staged meal could not be removed",
    };
  }

  revalidatePath("/");
  revalidatePath("/diet");

  return {
    ok: true,
    entry,
  };
}

const offlineItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("settings"),
    payload: profileSchema,
  }),
  z.object({
    type: z.literal("workout"),
    payload: workoutSchema,
    profile: profileSchema,
  }),
  z.object({
    type: z.literal("meal"),
    payload: mealSchema,
  }),
  z.object({
    type: z.literal("saved-food"),
    payload: savedFoodSchema,
  }),
  z.object({
    type: z.literal("quick-bundle"),
    payload: quickBundleSchema,
  }),
  z.object({
    type: z.literal("quick-bundle-log"),
    payload: quickBundleLogSchema,
  }),
  z.object({
    type: z.literal("quick-selection-log"),
    payload: quickSelectionLogSchema,
  }),
  z.object({
    type: z.literal("weekly-plan"),
    payload: weeklyPlanSchema,
  }),
]);

export async function replayOfflineQueueAction(
  queue: unknown[],
): Promise<{ ok: boolean; synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];

  for (const item of queue) {
    const parsed = offlineItemSchema.safeParse(item);

    if (!parsed.success) {
      errors.push("Skipped malformed queue item");
      continue;
    }

    if (parsed.data.type === "settings") {
      const result = await updateSettingsAction(parsed.data.payload);
      if (result.ok) {
        synced += 1;
      } else {
        errors.push(result.error ?? "Settings sync failed");
      }
      continue;
    }

    if (parsed.data.type === "meal") {
      const mealResult = await addMealLogAction(parsed.data.payload);
      if (mealResult.ok) {
        synced += 1;
      } else {
        errors.push(mealResult.error ?? "Meal sync failed");
      }
      continue;
    }

    if (parsed.data.type === "saved-food") {
      const savedFoodResult = await addSavedFoodAction(parsed.data.payload);

      if (savedFoodResult.ok) {
        synced += 1;
      } else {
        errors.push(savedFoodResult.error ?? "Saved food sync failed");
      }

      continue;
    }

    if (parsed.data.type === "quick-bundle") {
      const quickBundleResult = await addQuickBundleAction(parsed.data.payload);

      if (quickBundleResult.ok) {
        synced += 1;
      } else {
        errors.push(quickBundleResult.error ?? "Quick bundle sync failed");
      }

      continue;
    }

    if (parsed.data.type === "quick-bundle-log") {
      const quickBundleLogResult = await logQuickBundleAction(parsed.data.payload);

      if (quickBundleLogResult.ok) {
        synced += 1;
      } else {
        errors.push(quickBundleLogResult.error ?? "Quick bundle log sync failed");
      }

      continue;
    }

    if (parsed.data.type === "quick-selection-log") {
      const quickSelectionLogResult = await logQuickSelectionAction(parsed.data.payload);

      if (quickSelectionLogResult.ok) {
        synced += 1;
      } else {
        errors.push(quickSelectionLogResult.error ?? "Quick selection log sync failed");
      }

      continue;
    }

    if (parsed.data.type === "weekly-plan") {
      const planResult = await upsertWeeklyPlanEntryAction(parsed.data.payload);

      if (planResult.ok) {
        synced += 1;
      } else {
        errors.push(planResult.error ?? "Weekly plan sync failed");
      }

      continue;
    }

    const workoutResult = await addWorkoutLogAction(
      parsed.data.payload,
      parsed.data.profile,
    );

    if (workoutResult.ok) {
      synced += 1;
    } else {
      errors.push(workoutResult.error ?? "Workout sync failed");
    }
  }

  return {
    ok: errors.length === 0,
    synced,
    errors,
  };
}
