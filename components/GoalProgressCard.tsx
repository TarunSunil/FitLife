"use client";

import { Target } from "lucide-react";

type GoalProgressCardProps = {
  currentWeight: number;
  targetCalories: number;
  targetProtein: number;
  todayCalories: number;
  todayProtein: number;
};

export default function GoalProgressCard({
  currentWeight,
  targetCalories,
  targetProtein,
  todayCalories,
  todayProtein,
}: GoalProgressCardProps) {
  const calPct = targetCalories > 0 ? Math.min(100, (todayCalories / targetCalories) * 100) : 0;
  const proteinPct = targetProtein > 0 ? Math.min(100, (todayProtein / targetProtein) * 100) : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
        <Target className="h-4 w-4 text-lime-400" />
        Transformation Goal
      </h2>
      <div className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
        <div className="flex items-center justify-between gap-3 text-zinc-400">
          <span>Weight</span>
          <span className="text-right font-semibold text-white">{currentWeight} kg to 65-68 kg</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-3 text-zinc-400">
            <span>Calories today</span>
            <span>{Math.round(todayCalories)} / {targetCalories} kcal</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${calPct}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-3 text-zinc-400">
            <span>Protein today</span>
            <span>{Math.round(todayProtein)}g / {targetProtein}g</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${proteinPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
