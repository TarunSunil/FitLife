"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";

import {
  deleteWorkoutLogAction,
  updateWorkoutLogAction,
  type WorkoutActionResult,
} from "@/app/actions";
import type { WorkoutLog } from "@/lib/types/fitness";

type WorkoutLogsListProps = {
  logs: WorkoutLog[];
  onLogUpdated: (updated: WorkoutLog) => void;
  onLogDeleted: (logId: string) => void;
};

type Draft = {
  id: string;
  exercise: string;
  weight_kg: number;
  reps: number;
  tempo: string;
};

export default function WorkoutLogsList({ logs, onLogUpdated, onLogDeleted }: WorkoutLogsListProps) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exerciseOptions = useMemo(() => {
    const set = new Set(logs.map((log) => log.exercise));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const [exerciseFilter, setExerciseFilter] = useState("");

  const filteredLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
      .filter((log) => {
        const matchesQuery =
          !query.trim() ||
          log.exercise.toLowerCase().includes(query.toLowerCase()) ||
          log.tempo.toLowerCase().includes(query.toLowerCase());

        const matchesDate = !selectedDate || log.performed_at.startsWith(selectedDate);
        const matchesExercise = !exerciseFilter || log.exercise === exerciseFilter;

        return matchesQuery && matchesDate && matchesExercise;
      });
  }, [exerciseFilter, logs, query, selectedDate]);

  const saveEdit = () => {
    if (!editing) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result: WorkoutActionResult = await updateWorkoutLogAction(editing);

      if (!result.ok || !result.log) {
        setMessage(result.error ?? "Unable to update workout log");
        return;
      }

      onLogUpdated(result.log);
      setEditing(null);
      setMessage("Workout log updated");
    });
  };

  const deleteLog = (logId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteWorkoutLogAction(logId);

      if (!result.ok) {
        setMessage(result.error ?? "Unable to delete workout log");
        return;
      }

      onLogDeleted(logId);
      setMessage("Workout log deleted");
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Workout Logs</h2>
        <p className="text-xs text-zinc-400">Search, filter, edit, or remove existing workout entries.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300">
          <span className="mb-1 inline-flex items-center gap-1 text-zinc-400">
            <Search className="h-3.5 w-3.5" />
            Search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
            placeholder="Exercise or tempo"
          />
        </label>

        <label className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300">
          <span className="mb-1 block text-zinc-400">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
          />
        </label>

        <label className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300">
          <span className="mb-1 block text-zinc-400">Exercise</span>
          <select
            value={exerciseFilter}
            onChange={(event) => setExerciseFilter(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-lime-500"
          >
            <option value="">All</option>
            {exerciseOptions
              .filter((value) => value)
              .map((exercise) => (
                <option key={exercise} value={exercise}>
                  {exercise}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black px-3 py-4 text-sm text-zinc-400">
            No workout logs match your filters.
          </p>
        ) : null}

        {filteredLogs.map((log) => {
          const inEdit = editing?.id === log.id;

          return (
            <article
              key={log.id}
              className="rounded-xl border border-white/10 bg-black/70 p-3 text-sm text-zinc-200"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-zinc-100">{log.exercise}</strong>
                <span className="text-xs text-zinc-400">
                  {new Date(log.performed_at).toLocaleString()}
                </span>
              </div>

              {inEdit ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={editing.exercise}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, exercise: event.target.value } : current,
                      )
                    }
                    className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-white outline-none focus:border-lime-500"
                  />
                  <input
                    type="number"
                    value={editing.weight_kg}
                    onChange={(event) =>
                      setEditing((current) =>
                        current
                          ? { ...current, weight_kg: Number(event.target.value) || 0 }
                          : current,
                      )
                    }
                    className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-white outline-none focus:border-lime-500"
                  />
                  <input
                    type="number"
                    value={editing.reps}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, reps: Number(event.target.value) || 1 } : current,
                      )
                    }
                    className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-white outline-none focus:border-lime-500"
                  />
                  <input
                    value={editing.tempo}
                    onChange={(event) =>
                      setEditing((current) =>
                        current ? { ...current, tempo: event.target.value } : current,
                      )
                    }
                    className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs text-zinc-300">
                  <p className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5">
                    Weight: {log.weight_kg} kg
                  </p>
                  <p className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5">
                    Reps: {log.reps}
                  </p>
                  <p className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5">
                    Tempo: {log.tempo}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-2">
                {inEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={pending}
                      className="rounded-md bg-lime-500 px-2.5 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: log.id,
                          exercise: log.exercise,
                          reps: log.reps,
                          tempo: log.tempo,
                          weight_kg: log.weight_kg,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-zinc-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLog(log.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
    </section>
  );
}
