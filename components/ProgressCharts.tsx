"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildChartSeries, buildMealTrendSeries } from "@/lib/domain/profileRules";
import type { FitnessProfile, WorkoutLog } from "@/lib/types/fitness";
import type { MealLog } from "@/lib/types/nutrition";

type ProgressChartsProps = {
  profile: FitnessProfile;
  logs: WorkoutLog[];
  mealLogs: MealLog[];
};

export default function ProgressCharts({ profile, logs, mealLogs }: ProgressChartsProps) {
  const [mounted, setMounted] = useState(false);
  const trainingData = buildChartSeries(logs);
  const nutritionData = buildMealTrendSeries(
    mealLogs,
    profile.hidden_calorie_buffer_percent,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Activity className="h-4 w-4" />
          Progress Charts
        </h2>
        <p className="text-xs text-zinc-400">Targets are plotted live from Settings updates.</p>
      </header>

      <div className="rounded-xl border border-white/10 bg-black p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
          <span>Training Volume</span>
          <span>{logs.length} logged sets</span>
        </div>
        <div className="h-56 w-full overflow-hidden rounded-lg">
          {mounted ? (
            <ResponsiveContainer width="100%" height={224} debounce={500}>
              <LineChart data={trainingData} margin={{ top: 5, right: 8, left: -12, bottom: 5 }}>
                <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #27272a",
                    color: "#f4f4f5",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgLoad"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-white/10 bg-zinc-900/40" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
          <span>Calories Intake</span>
          <span>Target: {profile.target_calories}</span>
        </div>
        <div className="h-56 w-full overflow-hidden rounded-lg">
          {mounted ? (
            <ResponsiveContainer width="100%" height={224} debounce={500}>
              <LineChart data={nutritionData} margin={{ top: 5, right: 8, left: -12, bottom: 5 }}>
                <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #27272a",
                    color: "#f4f4f5",
                  }}
                />
                <ReferenceLine y={profile.target_calories} stroke="#84cc16" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-white/10 bg-zinc-900/40" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
          <span>Protein Intake</span>
          <span>Target: {profile.target_protein}g</span>
        </div>
        <div className="h-56 w-full overflow-hidden rounded-lg">
          {mounted ? (
            <ResponsiveContainer width="100%" height={224} debounce={500}>
              <LineChart data={nutritionData} margin={{ top: 5, right: 8, left: -12, bottom: 5 }}>
                <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #27272a",
                    color: "#f4f4f5",
                  }}
                />
                <ReferenceLine y={profile.target_protein} stroke="#84cc16" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="protein"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-white/10 bg-zinc-900/40" />
          )}
        </div>
      </div>

      {!nutritionData.length ? (
        <p className="text-xs text-zinc-400">Add meal logs in Diet Plan to unlock nutrition trend lines.</p>
      ) : null}
    </section>
  );
}
