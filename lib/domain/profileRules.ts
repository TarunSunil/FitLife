import type { FitnessProfile, WorkoutLog } from "@/lib/types/fitness";
import type { MealLog, WeeklyPlanEntry } from "@/lib/types/nutrition";

const BASE_EXERCISES = [
  "Back Squat",
  "Bench Press",
  "Pull-Ups",
  "Romanian Deadlift",
  "Dumbbell Shoulder Press",
];

const SHELF_STABLE_ITEMS = ["Tetra-packs", "Eggs", "Peanuts"];
const FRIDGE_ITEMS = ["Greek Yogurt", "Chicken"];

const SHELF_STABLE_MEAL_SUGGESTIONS = [
  {
    name: "Peanut Oat Bowl",
    calories: 540,
    protein: 24,
    ingredients: ["Oats", "Peanuts", "Tetra-pack milk"],
  },
  {
    name: "Eggs and Flatbread",
    calories: 430,
    protein: 22,
    ingredients: ["Eggs", "Flatbread", "Olive Oil"],
  },
  {
    name: "Lentil Rice Bowl",
    calories: 510,
    protein: 20,
    ingredients: ["Lentils", "Rice", "Spices"],
  },
];

const FRIDGE_MEAL_SUGGESTIONS = [
  {
    name: "Greek Yogurt Power Bowl",
    calories: 420,
    protein: 33,
    ingredients: ["Greek Yogurt", "Banana", "Granola"],
  },
  {
    name: "Chicken Rice Prep",
    calories: 610,
    protein: 44,
    ingredients: ["Chicken", "Rice", "Broccoli"],
  },
  {
    name: "Egg and Yogurt Wrap",
    calories: 470,
    protein: 31,
    ingredients: ["Eggs", "Greek Yogurt", "Tortilla"],
  },
];

export function getExerciseSuggestions(profile: FitnessProfile): string[] {
  if (profile.has_pullup_bar) {
    return BASE_EXERCISES;
  }

  return BASE_EXERCISES.map((exercise) =>
    exercise === "Pull-Ups" ? "Barbell Rows" : exercise,
  );
}

export function isTempoRequired(
  profile: Pick<FitnessProfile, "max_db_weight_kg">,
  weightKg: number,
): boolean {
  return weightKg >= profile.max_db_weight_kg;
}

export function getShoppingList(profile: FitnessProfile): string[] {
  if (!profile.has_fridge) {
    return SHELF_STABLE_ITEMS;
  }

  return [...SHELF_STABLE_ITEMS, ...FRIDGE_ITEMS];
}

export function buildChartSeries(logs: WorkoutLog[]) {
  const grouped = new Map<
    string,
    {
      volume: number;
      totalLoad: number;
      setCount: number;
    }
  >();

  for (const log of logs) {
    const day = log.performed_at.slice(0, 10);
    const current = grouped.get(day) ?? { volume: 0, totalLoad: 0, setCount: 0 };

    current.volume += log.reps * log.weight_kg;
    current.totalLoad += log.weight_kg;
    current.setCount += 1;

    grouped.set(day, current);
  }

  return [...grouped.entries()]
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([day, values]) => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      volume: Math.max(0, Math.round(values.volume)),
      avgLoad:
        values.setCount > 0
          ? Math.max(0, Math.round(values.totalLoad / values.setCount))
          : 0,
    }));
}

export function getDietSuggestions(profile: FitnessProfile) {
  const suggestions = profile.has_fridge
    ? [...SHELF_STABLE_MEAL_SUGGESTIONS, ...FRIDGE_MEAL_SUGGESTIONS]
    : SHELF_STABLE_MEAL_SUGGESTIONS;

  return suggestions.map((item) => ({
    ...item,
    targetCaloriesDelta: profile.target_calories - item.calories,
    targetProteinDelta: profile.target_protein - item.protein,
  }));
}

function getAdjustedMealCalories(meal: MealLog, hiddenCalorieBufferPercent: number): number {
  const outsideBase = Math.max(
    0,
    meal.outside_calories ?? (meal.is_outside_food ? meal.calories : 0),
  );

  const bufferMultiplier = Math.max(0, hiddenCalorieBufferPercent) / 100;
  return meal.calories + outsideBase * bufferMultiplier;
}

export function buildMealTrendSeries(
  meals: MealLog[],
  hiddenCalorieBufferPercent = 0,
) {
  const grouped = new Map<
    string,
    {
      calories: number;
      protein: number;
      mealCount: number;
    }
  >();

  for (const meal of meals) {
    const day = meal.consumed_on;
    const current = grouped.get(day) ?? { calories: 0, protein: 0, mealCount: 0 };

    current.calories += getAdjustedMealCalories(meal, hiddenCalorieBufferPercent);
    current.protein += meal.protein;
    current.mealCount += 1;

    grouped.set(day, current);
  }

  return [...grouped.entries()]
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([day, values]) => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      calories: Math.max(0, Math.round(values.calories)),
      protein: Math.max(0, Math.round(values.protein)),
      meals: values.mealCount,
    }));
}

export function summarizeDailyMeals(
  meals: MealLog[],
  date: string,
  hiddenCalorieBufferPercent = 0,
) {
  return meals
    .filter((meal) => meal.consumed_on === date)
    .reduce(
      (accumulator, meal) => {
        return {
          calories:
            accumulator.calories +
            getAdjustedMealCalories(meal, hiddenCalorieBufferPercent),
          protein: accumulator.protein + meal.protein,
          count: accumulator.count + 1,
        };
      },
      { calories: 0, protein: 0, count: 0 },
    );
}

export function buildDietShoppingList(
  profile: FitnessProfile,
  weeklyPlan: WeeklyPlanEntry[],
): string[] {
  const pantry = getShoppingList(profile);
  const ingredientSet = new Set<string>(pantry);

  for (const entry of weeklyPlan) {
    for (const ingredient of entry.ingredients) {
      ingredientSet.add(ingredient);
    }
  }

  if (!profile.has_fridge) {
    return [...ingredientSet].filter((item) => {
      const lower = item.toLowerCase();

      if (lower.includes("chicken") || lower.includes("yogurt")) {
        return false;
      }

      return true;
    });
  }

  return [...ingredientSet];
}
