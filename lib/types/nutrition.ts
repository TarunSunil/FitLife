export type MealLog = {
  id: string;
  profile_id: string;
  meal_name: string;
  calories: number;
  protein: number;
  ingredients: string[];
  is_outside_food: boolean;
  outside_calories: number;
  consumed_on: string;
  created_at: string;
};

export type AnalyzedNutritionItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type SavedFoodItem = {
  id: string;
  profile_id: string;
  name: string;
  calories: number;
  protein: number;
  is_outside_food: boolean;
  created_at: string;
  updated_at: string;
};

export type QuickBundle = {
  id: string;
  profile_id: string;
  name: string;
  item_ids: string[];
  created_at: string;
  updated_at: string;
};

export type WeeklyPlanEntry = {
  id: string;
  profile_id: string;
  day: string;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  meal_name: string;
  calories: number;
  protein: number;
  ingredients: string[];
  updated_at: string;
};
