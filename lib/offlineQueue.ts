"use client";

const OFFLINE_QUEUE_KEY = "fitness-offline-queue";

export type OfflineQueueItem =
  | {
      type: "settings";
      payload: {
        has_squat_rack: boolean;
        has_pullup_bar: boolean;
        has_bench: boolean;
        has_fridge: boolean;
        has_kettle: boolean;
        max_db_weight_kg: number;
        target_calories: number;
        target_protein: number;
        hidden_calorie_buffer_percent: number;
      };
    }
  | {
      type: "meal";
      payload: {
        meal_name: string;
        calories: number;
        protein: number;
        ingredients?: string[];
        is_outside_food: boolean;
        outside_calories?: number;
        consumed_on: string;
      };
    }
  | {
      type: "saved-food";
      payload: {
        name: string;
        calories: number;
        protein: number;
        is_outside_food: boolean;
      };
    }
  | {
      type: "weekly-plan";
      payload: {
        day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
        slot: "Breakfast" | "Lunch" | "Dinner" | "Snack";
        meal_name: string;
        calories?: number;
        protein?: number;
        ingredients: string[];
      };
    }
  | {
      type: "workout";
      payload: {
        exercise: string;
        weight_kg: number;
        reps: number;
        tempo: string;
      };
      profile: {
        has_squat_rack: boolean;
        has_pullup_bar: boolean;
        has_bench: boolean;
        has_fridge: boolean;
        has_kettle: boolean;
        max_db_weight_kg: number;
        target_calories: number;
        target_protein: number;
        hidden_calorie_buffer_percent: number;
      };
    };

function isBrowser() {
  return typeof window !== "undefined";
}

export function readQueue(): OfflineQueueItem[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    return [];
  }
}

export function writeQueue(items: OfflineQueueItem[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export function enqueue(item: OfflineQueueItem) {
  const current = readQueue();
  writeQueue([...current, item]);
}

export function clearQueue() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
}
