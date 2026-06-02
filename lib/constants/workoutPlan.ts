export type PlannedExercise = {
  name: string;
  sets: number;
  reps: string;
  tempo: string;
};

export type DayPlan = {
  label: string;
  tag: "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Rest";
  focus: string;
  exercises: PlannedExercise[];
};

export const WEEKLY_WORKOUT_PLAN: Record<string, DayPlan> = {
  Monday: {
    label: "Push",
    tag: "Push",
    focus: "Chest · Shoulders · Triceps",
    exercises: [
      { name: "Barbell Bench Press", sets: 3, reps: "8-10", tempo: "2-1-2" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", tempo: "2-0-2" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10", tempo: "2-1-2" },
      { name: "Cable Lateral Raise", sets: 3, reps: "12-15", tempo: "2-0-2" },
      { name: "Tricep Rope Pushdown", sets: 3, reps: "12", tempo: "2-0-2" },
    ],
  },
  Tuesday: {
    label: "Pull",
    tag: "Pull",
    focus: "Back · Biceps · Rear Delt",
    exercises: [
      { name: "Lat Pulldown (Wide Grip)", sets: 3, reps: "8-10", tempo: "2-1-2" },
      { name: "Seated Cable Row", sets: 3, reps: "10", tempo: "2-1-2" },
      { name: "Dumbbell Single-Arm Row", sets: 3, reps: "10", tempo: "2-0-2" },
      { name: "Face Pulls", sets: 3, reps: "15", tempo: "2-0-2" },
      { name: "Barbell Curl", sets: 3, reps: "10-12", tempo: "2-0-2" },
    ],
  },
  Wednesday: {
    label: "Legs",
    tag: "Legs",
    focus: "Quads · Hamstrings · Glutes · Calves",
    exercises: [
      { name: "Barbell Squat", sets: 3, reps: "8-10", tempo: "2-1-2" },
      { name: "Romanian Deadlift", sets: 3, reps: "10", tempo: "2-1-2" },
      { name: "Leg Press", sets: 3, reps: "12", tempo: "2-0-2" },
      { name: "Leg Curl Machine", sets: 3, reps: "12", tempo: "2-1-2" },
      { name: "Calf Raises", sets: 4, reps: "15", tempo: "2-0-2" },
    ],
  },
  Thursday: {
    label: "Upper",
    tag: "Upper",
    focus: "Chest · Back · Shoulders",
    exercises: [
      { name: "Incline Barbell Press", sets: 3, reps: "10", tempo: "2-1-2" },
      { name: "Chest-Supported Row", sets: 3, reps: "10", tempo: "2-1-2" },
      { name: "Arnold Press", sets: 3, reps: "10", tempo: "2-0-2" },
      { name: "Cable Fly", sets: 3, reps: "12", tempo: "2-0-2" },
      { name: "Hammer Curl", sets: 2, reps: "12", tempo: "2-0-2" },
      { name: "Overhead Tricep Extension", sets: 2, reps: "12", tempo: "2-1-2" },
    ],
  },
  Friday: {
    label: "Lower",
    tag: "Lower",
    focus: "Legs + Core",
    exercises: [
      { name: "Deadlift", sets: 3, reps: "6-8", tempo: "2-1-1" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10/leg", tempo: "2-0-2" },
      { name: "Leg Extension Machine", sets: 3, reps: "12", tempo: "2-0-2" },
      { name: "Plank", sets: 3, reps: "45 sec", tempo: "-" },
      { name: "Hanging Knee Raise", sets: 3, reps: "15", tempo: "2-0-2" },
    ],
  },
  Saturday: {
    label: "Rest",
    tag: "Rest",
    focus: "Active recovery - light walk or casual sport",
    exercises: [],
  },
  Sunday: {
    label: "Rest",
    tag: "Rest",
    focus: "Active recovery - light walk or casual sport",
    exercises: [],
  },
};

export function getTodayPlan(): DayPlan {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[new Date().getDay()];
  return WEEKLY_WORKOUT_PLAN[today];
}

export const TAG_COLORS: Record<DayPlan["tag"], string> = {
  Push: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  Pull: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  Legs: "border-lime-500/40 bg-lime-500/10 text-lime-300",
  Upper: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  Lower: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Rest: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};
