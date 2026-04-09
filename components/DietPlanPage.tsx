"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChefHat, ListPlus, PencilLine, Trash2, Upload } from "lucide-react";

import {
  addMealLogAction,
  analyzeMealImageAction,
  deleteMealLogAction,
  moveMealToWeeklyPlanAction,
  upsertWeeklyPlanEntryAction,
} from "@/app/actions";
import {
  buildDietShoppingList,
  summarizeDailyMeals,
} from "@/lib/domain/profileRules";
import { enqueue } from "@/lib/offlineQueue";
import type { FitnessProfile } from "@/lib/types/fitness";
import type {
  AnalyzedNutritionItem,
  MealLog,
  WeeklyPlanEntry,
} from "@/lib/types/nutrition";

type DietPlanPageProps = {
  profile: FitnessProfile;
  mealLogs: MealLog[];
  weeklyPlan: WeeklyPlanEntry[];
  onMealAdded: (meal: MealLog) => void;
  onMealDeleted: (mealId: string) => void;
  onPlanUpserted: (entry: WeeklyPlanEntry) => void;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const DAY_BY_JS_INDEX: Array<(typeof DAYS)[number] | "Sunday"> = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SWIPE_REVEAL_PX = 44;
const SWIPE_COMMIT_PX = 116;
const SWIPE_OPEN_X = 84;

function dayFromDate(dateValue: string): (typeof DAYS)[number] {
  const parsed = new Date(`${dateValue}T00:00:00`);
  const day = DAY_BY_JS_INDEX[parsed.getDay()] ?? "Monday";
  return day === "Sunday" ? "Sunday" : day;
}

function ingredientsToList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeNumericInput(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");

  if (!digitsOnly.length) {
    return "";
  }

  return digitsOnly.replace(/^0+(?=\d)/, "");
}

export default function DietPlanPage({
  profile,
  mealLogs,
  weeklyPlan,
  onMealAdded,
  onMealDeleted,
  onPlanUpserted,
}: DietPlanPageProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [mealName, setMealName] = useState("");
  const [mealCaloriesInput, setMealCaloriesInput] = useState("450");
  const [mealProteinInput, setMealProteinInput] = useState("30");
  const [mealOutsideFood, setMealOutsideFood] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealIngredients, setMealIngredients] = useState("");
  const [mealNote, setMealNote] = useState("");
  const [addToDaySlot, setAddToDaySlot] = useState<(typeof SLOTS)[number]>("Lunch");

  const [analyzingImg, setAnalyzingImg] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    mealName: string;
    calories: number;
    protein: number;
    ingredients: string;
    confidence: "High" | "Low";
    nutritionItems: AnalyzedNutritionItem[];
  } | null>(null);

  const [plannerDay, setPlannerDay] = useState<(typeof DAYS)[number]>("Monday");
  const [plannerSlot, setPlannerSlot] = useState<(typeof SLOTS)[number]>("Breakfast");
  const [plannerMealName, setPlannerMealName] = useState("");
  const [plannerIngredients, setPlannerIngredients] = useState("");
  const [revealedMealId, setRevealedMealId] = useState<string | null>(null);
  const [snapBackMealId, setSnapBackMealId] = useState<string | null>(null);
  const [movingMealId, setMovingMealId] = useState<string | null>(null);

  const shoppingList = useMemo(() => buildDietShoppingList(profile, weeklyPlan), [profile, weeklyPlan]);

  const todaySummary = useMemo(
    () =>
      summarizeDailyMeals(
        mealLogs,
        selectedDate,
        profile.hidden_calorie_buffer_percent,
      ),
    [mealLogs, selectedDate, profile.hidden_calorie_buffer_percent],
  );

  const orderedMeals = useMemo(
    () => [...mealLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [mealLogs],
  );

  const stagedMeals = useMemo(
    () => orderedMeals.filter((meal) => meal.consumed_on === selectedDate),
    [orderedMeals, selectedDate],
  );

  const mealCalories = Number.parseInt(mealCaloriesInput, 10) || 0;
  const mealProtein = Number.parseInt(mealProteinInput, 10) || 0;

  const weeklyEntriesByDay = useMemo(
    () =>
      DAYS.map((day) => ({
        day,
        slots: SLOTS.map((slot) => ({
          slot,
          entry: weeklyPlan.find((item) => item.day === day && item.slot === slot),
        })),
      })),
    [weeklyPlan],
  );

  const addMeal = () => {
    setMessage(null);
    const outsideCalories = mealOutsideFood ? mealCalories : 0;

    startTransition(async () => {
      try {
        const result = await addMealLogAction({
          meal_name: mealName,
          calories: mealCalories,
          protein: mealProtein,
          is_outside_food: mealOutsideFood,
          outside_calories: outsideCalories,
          consumed_on: selectedDate,
        });

        if (!result.ok || !result.meal) {
          setMessage(result.error ?? "Unable to save meal");
          return;
        }

        onMealAdded(result.meal);
        setMealName("");
        setMealCaloriesInput("450");
        setMealProteinInput("30");
        setMealOutsideFood(false);
        setMealIngredients("");
        setMealNote("");
        setMessage("Meal saved");
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueue({
            type: "meal",
            payload: {
              meal_name: mealName,
              calories: mealCalories,
              protein: mealProtein,
              is_outside_food: mealOutsideFood,
              outside_calories: outsideCalories,
              consumed_on: selectedDate,
            },
          });
          setMealName("");
          setMealCaloriesInput("450");
          setMealProteinInput("30");
          setMealOutsideFood(false);
          setMealIngredients("");
          setMealNote("");
          setMessage("Offline: meal queued for sync");
          return;
        }

        setMessage("Unable to save meal right now. Please try again.");
      }
    });
  };

  const addToDay = () => {
    if (mealName.trim().length < 2) {
      setMessage("Enter a meal name first.");
      return;
    }

    const detectedDay = dayFromDate(selectedDate);
    const cleanedIngredients = ingredientsToList(mealIngredients);
    const note = mealNote.trim();
    const ingredients = note.length ? [...cleanedIngredients, `Note: ${note.slice(0, 44)}`] : cleanedIngredients;

    startTransition(async () => {
      try {
        const result = await upsertWeeklyPlanEntryAction({
          day: detectedDay,
          slot: addToDaySlot,
          meal_name: mealName.trim(),
          ingredients,
        });

        if (!result.ok || !result.entry) {
          setMessage(result.error ?? "Unable to add meal to planner");
          return;
        }

        onPlanUpserted(result.entry);
        setMessage(`Added to ${detectedDay} - ${addToDaySlot}`);
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueue({
            type: "weekly-plan",
            payload: {
              day: detectedDay,
              slot: addToDaySlot,
              meal_name: mealName.trim(),
              ingredients,
            },
          });
          setMessage("Offline: planner update queued for sync");
          return;
        }

        setMessage("Unable to add this meal to planner right now.");
      }
    });
  };

  const removeMeal = (mealId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteMealLogAction(mealId);

      if (!result.ok) {
        setMessage(result.error ?? "Unable to delete meal");
        return;
      }

      onMealDeleted(mealId);
      setMessage("Meal removed");
    });
  };

  const savePlan = () => {
    const ingredients = ingredientsToList(plannerIngredients);

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await upsertWeeklyPlanEntryAction({
          day: plannerDay,
          slot: plannerSlot,
          meal_name: plannerMealName,
          ingredients,
        });

        if (!result.ok || !result.entry) {
          setMessage(result.error ?? "Unable to save weekly plan entry");
          return;
        }

        onPlanUpserted(result.entry);
        setMessage("Weekly planner updated");
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueue({
            type: "weekly-plan",
            payload: {
              day: plannerDay,
              slot: plannerSlot,
              meal_name: plannerMealName,
              ingredients,
            },
          });
          setMessage("Offline: planner entry queued for sync");
          return;
        }

        setMessage("Unable to update plan right now. Please try again.");
      }
    });
  };

  const clearPlannerSlot = (day: (typeof DAYS)[number], slot: (typeof SLOTS)[number]) => {
    startTransition(async () => {
      const result = await upsertWeeklyPlanEntryAction({
        day,
        slot,
        meal_name: "",
        ingredients: [],
      });

      if (!result.ok || !result.entry) {
        setMessage(result.error ?? "Unable to clear planner slot");
        return;
      }

      onPlanUpserted(result.entry);
      setMessage(`Cleared ${day} - ${slot}`);
    });
  };

  const editPlannerEntry = (entry: WeeklyPlanEntry) => {
    setPlannerDay(entry.day as (typeof DAYS)[number]);
    setPlannerSlot(entry.slot);
    setPlannerMealName(entry.meal_name);
    setPlannerIngredients(entry.ingredients.join(", "));
    setMessage(`Loaded ${entry.day} - ${entry.slot} into planner editor`);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalyzingImg(true);
    setMessage("Analyzing your meal...");

    const formData = new FormData();
    formData.append("image", file);

    startTransition(async () => {
      try {
        const result = await analyzeMealImageAction(formData);

        if (!result.ok || !result.data) {
          setMessage(result.error ?? "Unable to analyze meal image");
          return;
        }

        setVerificationData(result.data);
        setMealIngredients(result.data.ingredients);
        setMessage("Analysis complete");
      } catch {
        setMessage("Unable to process image right now. Please try again.");
      } finally {
        setAnalyzingImg(false);
      }
    });

    event.target.value = "";
  };

  const confirmVerifiedMeal = () => {
    if (!verificationData) return;

    setMealName(verificationData.mealName);
    setMealCaloriesInput(String(verificationData.calories));
    setMealProteinInput(String(verificationData.protein));
    setMealOutsideFood(false);
    setMealIngredients(verificationData.ingredients);

    startTransition(async () => {
      try {
        const result = await addMealLogAction({
          meal_name: verificationData.mealName,
          calories: verificationData.calories,
          protein: verificationData.protein,
          is_outside_food: false,
          outside_calories: 0,
          consumed_on: selectedDate,
          nutrition_items: verificationData.nutritionItems,
        });

        if (result.ok && result.meal) {
          onMealAdded(result.meal);
          setMessage("Meal saved via Quick Log");
        } else {
          setMessage(result.error ?? "Unable to auto-save quick log");
        }
      } finally {
        setVerificationData(null);
      }
    });
  };

  const rejectVerifiedMeal = () => {
    if (!verificationData) return;

    setMealName(verificationData.mealName);
    setMealCaloriesInput(String(verificationData.calories));
    setMealProteinInput(String(verificationData.protein));
    setMessage("Auto-fill complete. Please review inputs.");
    setVerificationData(null);
  };

  const moveStagedMealToPlanner = (meal: MealLog) => {
    if (movingMealId || pending) {
      return;
    }

    const detectedDay = dayFromDate(selectedDate);
    setMessage(null);
    setRevealedMealId(null);
    setMovingMealId(meal.id);

    startTransition(async () => {
      try {
        const result = await moveMealToWeeklyPlanAction({
          meal_log_id: meal.id,
          day: detectedDay,
          slot: addToDaySlot,
          meal_name: meal.meal_name,
          ingredients: [],
        });

        if (!result.ok || !result.entry) {
          setMessage(result.error ?? "Unable to move staged meal");
          return;
        }

        onPlanUpserted(result.entry);
        onMealDeleted(meal.id);
        setMessage(`Moved to ${detectedDay} - ${addToDaySlot}`);

        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(16);
        }
      } finally {
        setMovingMealId(null);
      }
    });
  };

  const autoDetectedDay = dayFromDate(selectedDate);

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      {verificationData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-white">Verification Prompt</h3>
            {verificationData.confidence === "Low" ? (
              <p className="mb-3 text-xs font-semibold text-amber-400">Low Confidence. Please verify this dish.</p>
            ) : null}
            <p className="text-sm text-zinc-300">
              Is this <strong>{verificationData.mealName}</strong>?
            </p>
            <div className="my-4 rounded border border-white/10 bg-black p-3 text-xs text-zinc-400">
              <p>Calories: {verificationData.calories} kcal</p>
              <p>Protein: {verificationData.protein}g</p>
              <p className="mt-1 wrap-break-word">Identified: {verificationData.ingredients}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmVerifiedMeal}
                className="flex-1 rounded-md bg-lime-500 py-2 text-sm font-semibold text-black transition hover:bg-lime-400"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={rejectVerifiedMeal}
                className="flex-1 rounded-md border border-white/10 bg-zinc-800 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                No, I&apos;ll type it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <ChefHat className="h-4 w-4" />
          Diet Plan
        </h2>
        <p className="text-xs text-zinc-400">
          Log meals, maintain weekly plans, and auto-generate shopping requirements.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
          <h3 className="flex items-center justify-between text-sm font-semibold text-zinc-200">
            <span>Daily Meal Logger</span>
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                analyzingImg
                  ? "cursor-not-allowed border-lime-500/40 bg-lime-500/10 text-lime-400"
                  : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {analyzingImg ? <Camera className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
              {analyzingImg ? "Analyzing..." : "Quick Log"}
              <input
                type="file"
                className="hidden"
                accept=".jpg,.png,.heic,.heif,.webp"
                onChange={handleImageUpload}
                disabled={analyzingImg}
              />
            </label>
          </h3>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-zinc-400">
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              />
            </label>

            <label className="text-xs text-zinc-400">
              Meal Name
              <input
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
                placeholder="Chicken bowl"
              />
            </label>

            <label className="text-xs text-zinc-400">
              Calories
              <input
                type="number"
                inputMode="numeric"
                value={mealCaloriesInput}
                onFocus={(event) => {
                  if (event.currentTarget.value === "0") {
                    event.currentTarget.select();
                  }
                }}
                onChange={(event) => setMealCaloriesInput(normalizeNumericInput(event.target.value))}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              />
            </label>

            <label className="text-xs text-zinc-400">
              Protein (g)
              <input
                type="number"
                inputMode="numeric"
                value={mealProteinInput}
                onFocus={(event) => {
                  if (event.currentTarget.value === "0") {
                    event.currentTarget.select();
                  }
                }}
                onChange={(event) => setMealProteinInput(normalizeNumericInput(event.target.value))}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              />
            </label>

            <label className="text-xs text-zinc-400 sm:col-span-2">
              Ingredients (review before adding)
              <textarea
                value={mealIngredients}
                onChange={(event) => setMealIngredients(event.target.value)}
                rows={3}
                placeholder="Ingredients from image analysis will appear here. You can edit before saving."
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-lime-500"
              />
            </label>

            <label className="text-xs text-zinc-400 sm:col-span-2">
              Notes (optional)
              <textarea
                value={mealNote}
                onChange={(event) => setMealNote(event.target.value)}
                rows={2}
                placeholder="e.g., less oil, post-workout meal, add fruit"
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-lime-500"
              />
            </label>

            <label className="text-xs text-zinc-400">
              Add To Day Slot
              <select
                value={addToDaySlot}
                onChange={(event) => setAddToDaySlot(event.target.value as (typeof SLOTS)[number])}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              >
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-xs text-zinc-400">
              <p className="mb-1">Auto-Detected Day</p>
              <div className="mt-1 rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200">
                {autoDetectedDay}
              </div>
            </div>

            <label className="text-xs text-zinc-400 sm:col-span-2">
              <span className="mb-1 block">Outside Food</span>
              <button
                type="button"
                onClick={() => setMealOutsideFood((current) => !current)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  mealOutsideFood
                    ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
                    : "border-white/10 bg-zinc-950 text-zinc-300"
                }`}
              >
                {mealOutsideFood ? "Yes (buffer applies)" : "No"}
              </button>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={addMeal}
              disabled={pending || mealName.trim().length < 2}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              <ListPlus className="h-4 w-4" />
              Add Meal
            </button>

            <button
              type="button"
              onClick={addToDay}
              disabled={pending || mealName.trim().length < 2}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-lime-500/60 bg-lime-500/10 px-3 py-2 text-sm font-semibold text-lime-300 disabled:opacity-60"
            >
              Add to Day
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            <p>Meals: {todaySummary.count}</p>
            <p>
              Calories: {todaySummary.calories} / {profile.target_calories}
            </p>
            <p>
              Protein: {todaySummary.protein}g / {profile.target_protein}g
            </p>
          </div>

          <p className="text-[11px] text-zinc-500">
            Swipe staged cards left-to-right to reveal <span className="font-semibold text-lime-300">Add to Day</span>.
          </p>

          <div className="max-h-48 space-y-2 overflow-auto pr-1">
            <AnimatePresence initial={false}>
              {stagedMeals.map((meal) => {
                const isMoving = movingMealId === meal.id;

                return (
                  <motion.div
                    key={meal.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="relative overflow-hidden rounded-md"
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-0 flex w-28 items-center justify-center">
                      <button
                        type="button"
                        onClick={() => moveStagedMealToPlanner(meal)}
                        disabled={pending || isMoving}
                        className="pointer-events-auto rounded-md border border-lime-500/40 bg-lime-500/15 px-2 py-1 text-[11px] font-semibold text-lime-200 disabled:opacity-50"
                      >
                        Add to Day
                      </button>
                    </div>

                    <motion.article
                      layout
                      drag="x"
                      dragConstraints={{ left: 0, right: 144 }}
                      dragElastic={0.1}
                      dragMomentum={false}
                      animate={{ x: revealedMealId === meal.id ? SWIPE_OPEN_X : 0 }}
                      whileDrag={{ scale: 0.995 }}
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      onDragStart={() => {
                        if (revealedMealId !== null && revealedMealId !== meal.id) {
                          setRevealedMealId(null);
                        }
                      }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x >= SWIPE_COMMIT_PX) {
                          moveStagedMealToPlanner(meal);
                          return;
                        }

                        if (info.offset.x >= SWIPE_REVEAL_PX) {
                          setRevealedMealId(meal.id);
                          return;
                        }

                        setRevealedMealId(null);
                        setSnapBackMealId(meal.id);

                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                          navigator.vibrate(8);
                        }

                        window.setTimeout(() => {
                          setSnapBackMealId((current) => (current === meal.id ? null : current));
                        }, 200);
                      }}
                      onClick={() => {
                        if (revealedMealId === meal.id) {
                          setRevealedMealId(null);
                        }
                      }}
                      className={`relative z-10 flex touch-pan-y items-center justify-between rounded-md border bg-zinc-950 px-2.5 py-2 text-xs text-zinc-300 ${
                        snapBackMealId === meal.id
                          ? "border-lime-500/50 shadow-[0_0_0_1px_rgba(132,204,22,0.35)]"
                          : "border-white/10"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-zinc-100">{meal.meal_name}</p>
                        <p>
                          {Math.round(
                            meal.calories +
                              (meal.outside_calories ?? (meal.is_outside_food ? meal.calories : 0)) *
                                (profile.hidden_calorie_buffer_percent / 100),
                          )}{" "}
                          kcal, {meal.protein}g protein
                        </p>
                        {meal.is_outside_food ? (
                          <p className="text-[11px] text-amber-300">
                            Outside Food +{profile.hidden_calorie_buffer_percent}% buffer
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeMeal(meal.id);
                        }}
                        disabled={pending || isMoving}
                        className="rounded-md border border-red-500/40 p-1.5 text-red-300 disabled:opacity-60"
                        aria-label="Delete meal log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.article>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

      </div>

      <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
        <h3 className="text-sm font-semibold text-zinc-200">Weekly Planner</h3>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-zinc-400">
            Day
            <select
              value={plannerDay}
              onChange={(event) => setPlannerDay(event.target.value as (typeof DAYS)[number])}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-400">
            Slot
            <select
              value={plannerSlot}
              onChange={(event) => setPlannerSlot(event.target.value as (typeof SLOTS)[number])}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
            >
              {SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-zinc-400">
            Planned Meal
            <input
              value={plannerMealName}
              onChange={(event) => setPlannerMealName(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              placeholder="Chicken Rice Prep"
            />
          </label>

          <label className="text-xs text-zinc-400">
            Ingredients
            <input
              value={plannerIngredients}
              onChange={(event) => setPlannerIngredients(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              placeholder="Chicken, Rice, Broccoli"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={savePlan}
          disabled={pending}
          className="rounded-md bg-lime-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          Save Planner Entry
        </button>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          {weeklyEntriesByDay.map(({ day, slots }) => (
            <article key={day} className="rounded-md border border-white/10 bg-zinc-950 px-2.5 py-2 text-xs">
              <p className="mb-2 font-semibold text-zinc-100">{day}</p>
              <ul className="space-y-2 text-zinc-300">
                {slots.map(({ slot, entry }) => (
                  <li key={`${day}-${slot}`} className="rounded border border-white/10 bg-black/60 p-2">
                    <p>
                      <span className="text-zinc-400">{slot}:</span> {entry?.meal_name || "-"}
                    </p>
                    {entry?.ingredients?.length ? (
                      <p className="mt-1 text-[11px] text-zinc-500">{entry.ingredients.join(", ")}</p>
                    ) : null}
                    {entry ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editPlannerEntry(entry)}
                          className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-[11px] text-zinc-200"
                        >
                          <PencilLine className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => clearPlannerSlot(day, slot)}
                          className="inline-flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-[11px] text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/10 bg-black/60 p-3">
        <h3 className="text-sm font-semibold text-zinc-200">Auto Shopping List</h3>
        <ul className="flex flex-wrap gap-2 text-xs">
          {shoppingList.map((item) => (
            <li key={item} className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
    </section>
  );
}
