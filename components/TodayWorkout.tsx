"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { getTodayPlan, TAG_COLORS, type PlannedExercise } from "@/lib/constants/workoutPlan";

type TodayWorkoutProps = {
  onSelectExercise?: (exercise: PlannedExercise) => void;
  defaultExpanded?: boolean;
};

export default function TodayWorkout({ onSelectExercise, defaultExpanded = false }: TodayWorkoutProps) {
  const plan = getTodayPlan();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tagClass = TAG_COLORS[plan.tag];

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarDays className="h-4 w-4" />
          Today&apos;s Session
        </h2>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-md border border-white/10 p-3 text-zinc-400 hover:text-white sm:p-1"
          aria-label={expanded ? "Collapse today's workout" : "Expand today's workout"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tagClass}`}>
          {plan.label}
        </span>
        <span className="text-xs text-zinc-400">{plan.focus}</span>
      </div>

      {expanded && plan.exercises.length > 0 ? (
        <ul className="space-y-2">
          {plan.exercises.map((exercise) => (
            <li
              key={exercise.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-3 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {exercise.sets}x{exercise.reps} · {exercise.tempo}
                </p>
              </div>
              {onSelectExercise ? (
                <button
                  type="button"
                  onClick={() => onSelectExercise(exercise)}
                  className="flex-shrink-0 rounded-xl border border-lime-500/40 bg-lime-500/10 px-3 py-3 text-xs font-semibold text-lime-300 active:bg-lime-500/30"
                >
                  Use
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {expanded && plan.exercises.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Rest day. Take a 20-30 min walk, hit protein, and get to sleep on time.
        </p>
      ) : null}

      <p className="text-[11px] text-zinc-600">
        Plan: Mon Push · Tue Pull · Wed Legs · Thu Upper · Fri Lower · Sat/Sun Rest
      </p>
    </section>
  );
}
