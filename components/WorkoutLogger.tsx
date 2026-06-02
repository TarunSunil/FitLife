"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock3, Dumbbell, ListChecks, Plus } from "lucide-react";

import { addWorkoutLogAction } from "@/app/actions";
import TodayWorkout from "@/components/TodayWorkout";
import { getExerciseSuggestions, isTempoRequired } from "@/lib/domain/profileRules";
import { enqueue } from "@/lib/offlineQueue";
import type { PlannedExercise } from "@/lib/constants/workoutPlan";
import type { FitnessProfile, WorkoutLog } from "@/lib/types/fitness";

type WorkoutLoggerProps = {
  profile: FitnessProfile;
  logs: WorkoutLog[];
  onLogAdded: (log: WorkoutLog) => void;
};

export default function WorkoutLogger({ profile, logs, onLogAdded }: WorkoutLoggerProps) {
  const [pending, startTransition] = useTransition();
  const suggestions = useMemo(() => getExerciseSuggestions(profile), [profile]);

  const [exercise, setExercise] = useState(suggestions[0] ?? "Back Squat");
  const [weightKg, setWeightKg] = useState(20);
  const [reps, setReps] = useState(8);
  const [tempo, setTempo] = useState("2-0-2");
  const [message, setMessage] = useState<string | null>(null);

  const tempoWarning = isTempoRequired(profile, weightKg);
  const previousBest = useMemo(() => {
    const normalizedExercise = exercise.trim().toLowerCase();
    if (!normalizedExercise) {
      return null;
    }

    return logs
      .filter((log) => log.exercise.toLowerCase() === normalizedExercise)
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())[0] ?? null;
  }, [logs, exercise]);

  const isNewPR = previousBest
    ? weightKg > previousBest.weight_kg ||
      (weightKg === previousBest.weight_kg && reps > previousBest.reps)
    : false;

  const submitLog = () => {
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await addWorkoutLogAction(
          {
            exercise,
            weight_kg: weightKg,
            reps,
            tempo,
          },
          {
            has_squat_rack: profile.has_squat_rack,
            has_pullup_bar: profile.has_pullup_bar,
            has_bench: profile.has_bench,
            has_fridge: profile.has_fridge,
            has_kettle: profile.has_kettle,
            max_db_weight_kg: profile.max_db_weight_kg,
            target_calories: profile.target_calories,
            target_protein: profile.target_protein,
            hidden_calorie_buffer_percent: profile.hidden_calorie_buffer_percent,
          },
        );

        if (!result.ok || !result.log) {
          setMessage(result.error ?? "Unable to save workout log");
          return;
        }

        onLogAdded(result.log);
        setMessage(result.tempoRequired ? "Tempo priority mode active" : "Workout saved");
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueue({
            type: "workout",
            payload: {
              exercise,
              weight_kg: weightKg,
              reps,
              tempo,
            },
            profile: {
              has_squat_rack: profile.has_squat_rack,
              has_pullup_bar: profile.has_pullup_bar,
              has_bench: profile.has_bench,
              has_fridge: profile.has_fridge,
              has_kettle: profile.has_kettle,
              max_db_weight_kg: profile.max_db_weight_kg,
              target_calories: profile.target_calories,
              target_protein: profile.target_protein,
              hidden_calorie_buffer_percent: profile.hidden_calorie_buffer_percent,
            },
          });
          setMessage("Offline: workout queued for sync");
          return;
        }

        setMessage("Unable to save workout right now. Please try again.");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Dumbbell className="h-4 w-4" />
          Workout Logger
        </h2>
        <p className="text-xs text-zinc-400">
          Suggestions adapt to environment profile and available equipment.
        </p>
      </header>

      <TodayWorkout
        defaultExpanded={true}
        onSelectExercise={(selected: PlannedExercise) => {
          setExercise(selected.name);
          setTempo(selected.tempo === "-" ? tempo : selected.tempo);
        }}
      />

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
          <ListChecks className="h-4 w-4" />
          Suggested Exercises
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setExercise(suggestion)}
              className={`rounded-full border px-3 py-3 text-center text-xs transition ${
                exercise === suggestion
                  ? "border-lime-500 bg-lime-500/20 text-lime-300"
                  : "border-white/15 bg-black text-zinc-200"
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <span className="mb-2 block text-zinc-300">Exercise</span>
          <input
            value={exercise}
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => setExercise(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base text-white outline-none focus:border-lime-500"
          />
        </label>

        <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <span className="mb-2 block text-zinc-300">Weight (kg)</span>
          <input
            type="number"
            inputMode="numeric"
            value={weightKg}
            min={0}
            max={500}
            onChange={(event) => setWeightKg(Number(event.target.value) || 0)}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base text-white outline-none focus:border-lime-500"
          />
        </label>

        <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <span className="mb-2 block text-zinc-300">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            min={1}
            max={100}
            onChange={(event) => setReps(Number(event.target.value) || 1)}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base text-white outline-none focus:border-lime-500"
          />
        </label>

        <label
          className={`rounded-xl border p-3 text-sm transition ${
            tempoWarning
              ? "border-red-500 bg-red-500/10"
              : "border-white/10 bg-white/5"
          }`}
        >
          <span
            className={`mb-2 flex items-center gap-2 ${
              tempoWarning ? "text-red-300" : "text-zinc-300"
            }`}
          >
            <Clock3 className="h-4 w-4" />
            Tempo
          </span>
          <input
            value={tempo}
            onChange={(event) => setTempo(event.target.value)}
            className={`w-full rounded-lg border px-3 py-3 text-base text-white outline-none ${
              tempoWarning
                ? "border-red-500 bg-black focus:border-red-400"
                : "border-white/15 bg-black focus:border-lime-500"
            }`}
          />
          {tempoWarning ? (
            <p className="mt-2 text-xs text-red-300">
              Max dumbbell load reached. Drive progress with slow negatives.
            </p>
          ) : null}
        </label>
      </div>

      {previousBest ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            isNewPR
              ? "border-lime-500/50 bg-lime-500/10 text-lime-300"
              : "border-white/10 bg-black/40 text-zinc-400"
          }`}
        >
          {isNewPR ? "New PR incoming:" : "Previous best:"} {previousBest.weight_kg} kg x {previousBest.reps} reps
        </div>
      ) : exercise.trim().length > 1 ? (
        <p className="text-xs text-zinc-600">First time logging this exercise. Make it count.</p>
      ) : null}

      <button
        type="button"
        onClick={submitLog}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 px-4 py-4 text-base font-semibold text-black transition-transform hover:bg-lime-400 disabled:opacity-60 active:scale-95 sm:py-2 sm:text-sm"
      >
        <Plus className="h-4 w-4" />
        {pending ? "Saving..." : "Add Log"}
      </button>

      {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
    </section>
  );
}
