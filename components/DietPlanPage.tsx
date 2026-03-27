"use client";

import { useMemo, useState, useTransition } from "react";
import { ChefHat, Layers, ListPlus, PackagePlus, Trash2 } from "lucide-react";

import {
  addQuickBundleAction,
  addSavedFoodAction,
  addMealLogAction,
  deleteQuickBundleAction,
  deleteSavedFoodAction,
  deleteMealLogAction,
  logQuickBundleAction,
  logQuickSelectionAction,
  upsertWeeklyPlanEntryAction,
} from "@/app/actions";
import {
  buildDietShoppingList,
  getDietSuggestions,
  summarizeDailyMeals,
} from "@/lib/domain/profileRules";
import { enqueue } from "@/lib/offlineQueue";
import type { FitnessProfile } from "@/lib/types/fitness";
import type {
  MealLog,
  QuickBundle,
  SavedFoodItem,
  WeeklyPlanEntry,
} from "@/lib/types/nutrition";

type DietPlanPageProps = {
  profile: FitnessProfile;
  mealLogs: MealLog[];
  weeklyPlan: WeeklyPlanEntry[];
  savedFoods: SavedFoodItem[];
  quickBundles: QuickBundle[];
  onMealAdded: (meal: MealLog) => void;
  onMealDeleted: (mealId: string) => void;
  onSavedFoodAdded: (savedFood: SavedFoodItem) => void;
  onSavedFoodDeleted: (savedFoodId: string) => void;
  onQuickBundleAdded: (bundle: QuickBundle) => void;
  onQuickBundleDeleted: (bundleId: string) => void;
  onPlanUpserted: (entry: WeeklyPlanEntry) => void;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export default function DietPlanPage({
  profile,
  mealLogs,
  weeklyPlan,
  savedFoods,
  quickBundles,
  onMealAdded,
  onMealDeleted,
  onSavedFoodAdded,
  onSavedFoodDeleted,
  onQuickBundleAdded,
  onQuickBundleDeleted,
  onPlanUpserted,
}: DietPlanPageProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState(450);
  const [mealProtein, setMealProtein] = useState(30);
  const [mealOutsideFood, setMealOutsideFood] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [savedFoodName, setSavedFoodName] = useState("");
  const [savedFoodCalories, setSavedFoodCalories] = useState(450);
  const [savedFoodProtein, setSavedFoodProtein] = useState(30);
  const [savedFoodOutside, setSavedFoodOutside] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);

  const [plannerDay, setPlannerDay] = useState<(typeof DAYS)[number]>("Monday");
  const [plannerSlot, setPlannerSlot] = useState<(typeof SLOTS)[number]>("Breakfast");
  const [plannerMealName, setPlannerMealName] = useState("");
  const [plannerIngredients, setPlannerIngredients] = useState("");

  const suggestions = useMemo(() => getDietSuggestions(profile), [profile]);

  const savedFoodsById = useMemo(
    () => new Map(savedFoods.map((food) => [food.id, food])),
    [savedFoods],
  );

  const selectedFoods = useMemo(
    () => selectedFoodIds.map((id) => savedFoodsById.get(id)).filter((food): food is SavedFoodItem => Boolean(food)),
    [savedFoodsById, selectedFoodIds],
  );

  const selectedTotals = useMemo(
    () =>
      selectedFoods.reduce(
        (accumulator, food) => {
          return {
            calories: accumulator.calories + food.calories,
            protein: accumulator.protein + food.protein,
            outsideCalories: accumulator.outsideCalories + (food.is_outside_food ? food.calories : 0),
          };
        },
        { calories: 0, protein: 0, outsideCalories: 0 },
      ),
    [selectedFoods],
  );

  const todaySummary = useMemo(
    () =>
      summarizeDailyMeals(
        mealLogs,
        selectedDate,
        profile.hidden_calorie_buffer_percent,
      ),
    [mealLogs, selectedDate, profile.hidden_calorie_buffer_percent],
  );

  const shoppingList = useMemo(
    () => buildDietShoppingList(profile, weeklyPlan),
    [profile, weeklyPlan],
  );

  const orderedMeals = useMemo(() => {
    return [...mealLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [mealLogs]);

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
        setMealOutsideFood(false);
        setMessage("Meal saved");
      } catch {
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
        setMealOutsideFood(false);
        setMessage("Offline: meal queued for sync");
      }
    });
  };

  const addSavedFood = () => {
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await addSavedFoodAction({
          name: savedFoodName,
          calories: savedFoodCalories,
          protein: savedFoodProtein,
          is_outside_food: savedFoodOutside,
        });

        if (!result.ok || !result.savedFood) {
          setMessage(result.error ?? "Unable to save food item");
          return;
        }

        onSavedFoodAdded(result.savedFood);
        setSavedFoodName("");
        setSavedFoodOutside(false);
        setMessage("Saved food added");
      } catch {
        enqueue({
          type: "saved-food",
          payload: {
            name: savedFoodName,
            calories: savedFoodCalories,
            protein: savedFoodProtein,
            is_outside_food: savedFoodOutside,
          },
        });
        setSavedFoodName("");
        setSavedFoodOutside(false);
        setMessage("Offline: saved food queued for sync");
      }
    });
  };

  const removeSavedFood = (savedFoodId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteSavedFoodAction(savedFoodId);

      if (!result.ok) {
        setMessage(result.error ?? "Unable to delete saved food");
        return;
      }

      onSavedFoodDeleted(savedFoodId);
      setSelectedFoodIds((current) => current.filter((id) => id !== savedFoodId));
      setMessage("Saved food deleted");
    });
  };

  const toggleSavedFood = (savedFoodId: string) => {
    setSelectedFoodIds((current) => {
      if (current.includes(savedFoodId)) {
        return current.filter((id) => id !== savedFoodId);
      }

      return [...current, savedFoodId];
    });
  };

  const saveQuickBundle = () => {
    if (!selectedFoodIds.length) {
      setMessage("Select at least one saved food to create a quick bundle");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await addQuickBundleAction({
          name: bundleName.trim() || `Quick Bundle (${selectedFoodIds.length})`,
          item_ids: selectedFoodIds,
        });

        if (!result.ok || !result.bundle) {
          setMessage(result.error ?? "Unable to save quick bundle");
          return;
        }

        onQuickBundleAdded(result.bundle);
        setBundleName("");
        setMessage("Quick bundle saved");
      } catch {
        enqueue({
          type: "quick-bundle",
          payload: {
            name: bundleName.trim() || `Quick Bundle (${selectedFoodIds.length})`,
            item_ids: selectedFoodIds,
          },
        });
        setBundleName("");
        setMessage("Offline: quick bundle queued for sync");
      }
    });
  };

  const logSelectionNow = () => {
    if (!selectedFoodIds.length) {
      setMessage("Select at least one saved food to log quick bundle");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await logQuickSelectionAction({
          item_ids: selectedFoodIds,
          consumed_on: selectedDate,
          bundle_name: bundleName.trim() || undefined,
        });

        if (!result.ok || !result.meal) {
          setMessage(result.error ?? "Unable to log quick bundle selection");
          return;
        }

        onMealAdded(result.meal);
        setMessage("Quick bundle logged");
      } catch {
        enqueue({
          type: "quick-selection-log",
          payload: {
            item_ids: selectedFoodIds,
            consumed_on: selectedDate,
            bundle_name: bundleName.trim() || undefined,
          },
        });
        setMessage("Offline: quick selection log queued for sync");
      }
    });
  };

  const logSavedQuickBundle = (bundleId: string) => {
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await logQuickBundleAction({
          bundle_id: bundleId,
          consumed_on: selectedDate,
        });

        if (!result.ok || !result.meal) {
          setMessage(result.error ?? "Unable to log quick bundle");
          return;
        }

        onMealAdded(result.meal);
        setMessage("Quick bundle logged");
      } catch {
        enqueue({
          type: "quick-bundle-log",
          payload: {
            bundle_id: bundleId,
            consumed_on: selectedDate,
          },
        });
        setMessage("Offline: quick bundle log queued for sync");
      }
    });
  };

  const removeQuickBundle = (bundleId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteQuickBundleAction(bundleId);

      if (!result.ok) {
        setMessage(result.error ?? "Unable to delete quick bundle");
        return;
      }

      onQuickBundleDeleted(bundleId);
      setMessage("Quick bundle deleted");
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
    const ingredients = plannerIngredients
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

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
      }
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <ChefHat className="h-4 w-4" />
          Diet Plan
        </h2>
        <p className="text-xs text-zinc-400">
          Log meals, maintain weekly plans, and auto-generate shopping requirements.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
          <h3 className="text-sm font-semibold text-zinc-200">Daily Meal Logger</h3>
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
                value={mealCalories}
                onChange={(event) => setMealCalories(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Protein (g)
              <input
                type="number"
                value={mealProtein}
                onChange={(event) => setMealProtein(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              />
            </label>
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

          <button
            type="button"
            onClick={addMeal}
            disabled={pending || mealName.trim().length < 2}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            <ListPlus className="h-4 w-4" />
            Add Meal
          </button>

          <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            <p>Meals: {todaySummary.count}</p>
            <p>
              Calories: {todaySummary.calories} / {profile.target_calories}
            </p>
            <p>
              Protein: {todaySummary.protein}g / {profile.target_protein}g
            </p>
          </div>

          <div className="max-h-48 space-y-2 overflow-auto pr-1">
            {orderedMeals
              .filter((meal) => meal.consumed_on === selectedDate)
              .map((meal) => (
                <article
                  key={meal.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-300"
                >
                  <div>
                    <p className="font-semibold text-zinc-100">{meal.meal_name}</p>
                    <p>
                      {Math.round(
                        meal.calories +
                          (meal.outside_calories ?? (meal.is_outside_food ? meal.calories : 0)) *
                            (profile.hidden_calorie_buffer_percent / 100),
                      )} kcal, {meal.protein}g protein
                    </p>
                    {meal.is_outside_food ? (
                      <p className="text-[11px] text-amber-300">
                        Outside Food +{profile.hidden_calorie_buffer_percent}% buffer
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMeal(meal.id)}
                    disabled={pending}
                    className="rounded-md border border-red-500/40 p-1.5 text-red-300 disabled:opacity-60"
                    aria-label="Delete meal log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
          <h3 className="text-sm font-semibold text-zinc-200">Suggested Meals</h3>
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.name}
                className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
              >
                <p className="font-semibold text-zinc-100">{suggestion.name}</p>
                <p>
                  {suggestion.calories} kcal, {suggestion.protein}g protein
                </p>
                <p className="mt-1 text-zinc-400">{suggestion.ingredients.join(", ")}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <PackagePlus className="h-4 w-4" />
          Saved Foods
        </h3>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <label className="text-xs text-zinc-400 md:col-span-2">
            Food Name
            <input
              value={savedFoodName}
              onChange={(event) => setSavedFoodName(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              placeholder="Egg chicken roll"
            />
          </label>

          <label className="text-xs text-zinc-400">
            Calories
            <input
              type="number"
              value={savedFoodCalories}
              onChange={(event) => setSavedFoodCalories(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
            />
          </label>

          <label className="text-xs text-zinc-400">
            Protein (g)
            <input
              type="number"
              value={savedFoodProtein}
              onChange={(event) => setSavedFoodProtein(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
            />
          </label>

          <label className="text-xs text-zinc-400">
            Outside Food
            <button
              type="button"
              onClick={() => setSavedFoodOutside((current) => !current)}
              className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm ${
                savedFoodOutside
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
                  : "border-white/10 bg-zinc-950 text-zinc-300"
              }`}
            >
              {savedFoodOutside ? "Yes" : "No"}
            </button>
          </label>
        </div>

        <button
          type="button"
          onClick={addSavedFood}
          disabled={pending || savedFoodName.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-md bg-lime-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          <ListPlus className="h-4 w-4" />
          Save Food Item
        </button>

        <div className="max-h-56 space-y-2 overflow-auto pr-1">
          {savedFoods.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
              No saved foods yet. Add reusable items to build quick bundles.
            </p>
          ) : null}

          {savedFoods.map((food) => {
            const selected = selectedFoodIds.includes(food.id);

            return (
              <article
                key={food.id}
                className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleSavedFood(food.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-sm border ${
                      selected ? "border-lime-400 bg-lime-400" : "border-zinc-500"
                    }`}
                  />
                  <span>
                    <span className="block font-semibold text-zinc-100">{food.name}</span>
                    <span className="text-zinc-300">
                      {food.calories} kcal, {food.protein}g protein
                    </span>
                    {food.is_outside_food ? (
                      <span className="block text-[11px] text-amber-300">Outside Food</span>
                    ) : null}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => removeSavedFood(food.id)}
                  disabled={pending}
                  className="rounded-md border border-red-500/40 p-1.5 text-red-300 disabled:opacity-60"
                  aria-label="Delete saved food"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Layers className="h-4 w-4" />
          Quick Bundle
        </h3>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr]">
          <label className="text-xs text-zinc-400">
            Bundle Name
            <input
              value={bundleName}
              onChange={(event) => setBundleName(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
              placeholder="3-roll bundle"
            />
          </label>

          <button
            type="button"
            onClick={saveQuickBundle}
            disabled={pending || selectedFoodIds.length === 0}
            className="self-end rounded-md bg-lime-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Save Bundle
          </button>

          <button
            type="button"
            onClick={logSelectionNow}
            disabled={pending || selectedFoodIds.length === 0}
            className="self-end rounded-md border border-lime-500/50 px-3 py-2 text-sm font-semibold text-lime-300 disabled:opacity-60"
          >
            Log Selected Now
          </button>
        </div>

        <div className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          <p>Selected foods: {selectedFoods.length}</p>
          <p>Calories: {selectedTotals.calories}</p>
          <p>Protein: {selectedTotals.protein}g</p>
        </div>

        <div className="space-y-2">
          {quickBundles.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
              No quick bundles yet.
            </p>
          ) : null}

          {quickBundles.map((bundle) => {
            const foods = bundle.item_ids
              .map((id) => savedFoodsById.get(id))
              .filter((food): food is SavedFoodItem => Boolean(food));

            const calories = foods.reduce((sum, food) => sum + food.calories, 0);
            const protein = foods.reduce((sum, food) => sum + food.protein, 0);

            return (
              <article
                key={bundle.id}
                className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-100">{bundle.name}</p>
                    <p className="text-zinc-300">
                      {foods.length} items · {calories} kcal · {protein}g protein
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logSavedQuickBundle(bundle.id)}
                      disabled={pending}
                      className="rounded-md bg-lime-500 px-2.5 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      Log 1-Click
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuickBundle(bundle.id)}
                      disabled={pending}
                      className="rounded-md border border-red-500/40 p-1.5 text-red-300 disabled:opacity-60"
                      aria-label="Delete quick bundle"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

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
          {DAYS.map((day) => (
            <article key={day} className="rounded-md border border-white/10 bg-zinc-950 px-2.5 py-2 text-xs">
              <p className="mb-2 font-semibold text-zinc-100">{day}</p>
              <ul className="space-y-1 text-zinc-300">
                {SLOTS.map((slot) => {
                  const entry = weeklyPlan.find((item) => item.day === day && item.slot === slot);
                  return (
                    <li key={`${day}-${slot}`}>
                      <span className="text-zinc-400">{slot}:</span>{" "}
                      {entry?.meal_name || "-"}
                    </li>
                  );
                })}
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
