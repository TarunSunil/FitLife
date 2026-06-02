import type {
  MealLog,
  QuickBundle,
  SavedFoodItem,
  WeeklyPlanEntry,
} from "@/lib/types/nutrition";

export type FitnessProfile = {
  id: string;
  has_squat_rack: boolean;
  has_pullup_bar: boolean;
  has_bench: boolean;
  has_fridge: boolean;
  has_kettle: boolean;
  max_db_weight_kg: number;
  target_calories: number;
  target_protein: number;
  hidden_calorie_buffer_percent: number;
  updated_at: string;
};

export type WorkoutLog = {
  id: string;
  profile_id: string;
  exercise: string;
  weight_kg: number;
  reps: number;
  tempo: string;
  performed_at: string;
};

export type BodyWeightLog = {
  id: string;
  weight_kg: number;
  logged_on: string;
  note?: string;
  created_at: string;
};

export type FitnessDatabase = {
  profiles: FitnessProfile[];
  workout_logs: WorkoutLog[];
  meal_logs: MealLog[];
  weekly_plan: WeeklyPlanEntry[];
  saved_foods: SavedFoodItem[];
  quick_bundles: QuickBundle[];
  body_weight_logs: BodyWeightLog[];
};

export const PROFILE_ID = "local-profile";

export const DEFAULT_PROFILE: FitnessProfile = {
  id: PROFILE_ID,
  has_squat_rack: true,
  has_pullup_bar: true,
  has_bench: true,
  has_fridge: true,
  has_kettle: true,
  max_db_weight_kg: 30,
  target_calories: 2700,
  target_protein: 105,
  hidden_calorie_buffer_percent: 10,
  updated_at: new Date().toISOString(),
};
