"use client";

import { useMemo, useState, useTransition } from "react";
import { Scale, TrendingUp } from "lucide-react";

import { addBodyWeightLogAction } from "@/app/actions";
import type { BodyWeightLog } from "@/lib/types/fitness";

const START_WEIGHT = 57;
const TARGET_MIN = 65;
const TARGET_MAX = 68;

type BodyWeightTrackerProps = {
  initialLogs: BodyWeightLog[];
};

export default function BodyWeightTracker({ initialLogs }: BodyWeightTrackerProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [weightInput, setWeightInput] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : START_WEIGHT;
  const progressPct = Math.min(100, ((latestWeight - START_WEIGHT) / (TARGET_MIN - START_WEIGHT)) * 100);

  const monthlyGain = useMemo(() => {
    if (logs.length < 2) {
      return null;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = logs.filter((log) => new Date(log.logged_on) >= thirtyDaysAgo);
    if (recent.length < 2) {
      return null;
    }

    return recent[recent.length - 1].weight_kg - recent[0].weight_kg;
  }, [logs]);

  const logWeight = () => {
    const weight = Number.parseFloat(weightInput);

    if (Number.isNaN(weight) || weight < 30 || weight > 200) {
      setMessage("Enter a valid weight between 30-200 kg");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      const result = await addBodyWeightLogAction({
        weight_kg: weight,
        logged_on: today,
        note: note.trim() || undefined,
      });

      if (result.ok && result.log) {
        setLogs((current) => [...current, result.log!]);
        setWeightInput("");
        setNote("");
        setMessage(`${weight} kg logged`);
        return;
      }

      setMessage(result.error ?? "Unable to log weight");
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Scale className="h-4 w-4" />
          Body Weight
        </h2>
        <p className="text-xs text-zinc-400">Log every Monday morning before eating.</p>
      </header>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
          <span>Start: {START_WEIGHT} kg</span>
          <span className="font-semibold text-white">{latestWeight} kg</span>
          <span>Target: {TARGET_MIN}-{TARGET_MAX} kg</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-lime-500 transition-all duration-500"
            style={{ width: `${Math.max(0, progressPct)}%` }}
          />
        </div>
        <p className="text-right text-xs text-zinc-500">
          {Math.max(0, TARGET_MIN - latestWeight).toFixed(1)} kg to go
        </p>
      </div>

      {monthlyGain !== null ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            monthlyGain >= 0.5
              ? "border-lime-500/40 bg-lime-500/10 text-lime-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {monthlyGain >= 0.5
            ? `+${monthlyGain.toFixed(1)} kg this month. On track.`
            : `+${monthlyGain.toFixed(1)} kg this month. Target is 0.5-1 kg/month.`}
        </div>
      ) : null}

      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weightInput}
          placeholder="57.0"
          onChange={(event) => setWeightInput(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-zinc-950 py-4 pl-4 pr-12 text-center font-mono text-2xl font-semibold text-white outline-none focus:border-lime-500"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">kg</span>
      </div>
      <input
        value={note}
        placeholder="Note (optional)"
        onChange={(event) => setNote(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-3 text-base text-white outline-none focus:border-lime-500"
      />

      <button
        type="button"
        onClick={logWeight}
        disabled={pending || !weightInput}
        className="w-full rounded-2xl bg-lime-500 py-4 text-base font-bold text-black transition-transform disabled:opacity-60 active:scale-95"
      >
        {pending ? "Logging..." : "Log Weight"}
      </button>

      {logs.length > 0 ? (
        <ul className="space-y-1 text-xs text-zinc-400">
          {[...logs].reverse().slice(0, 8).map((log) => (
            <li
              key={log.id}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-2"
            >
              <span>{log.logged_on}</span>
              <span className="font-semibold text-zinc-200">{log.weight_kg} kg</span>
              {log.note ? <span className="col-span-2 text-zinc-500">{log.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
    </section>
  );
}
