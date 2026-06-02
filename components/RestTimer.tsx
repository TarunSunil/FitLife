"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

const PRESETS = [60, 90, 120] as const;
const DEFAULT_SECONDS = 90;

export default function RestTimer() {
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((current) => {
          if (current <= 1) {
            setRunning(false);
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }

          return current - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running]);

  const reset = (nextSeconds = seconds) => {
    setRunning(false);
    setRemaining(nextSeconds);
  };
  const selectPreset = (nextSeconds: number) => {
    setSeconds(nextSeconds);
    reset(nextSeconds);
  };
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const isLow = remaining <= 10 && remaining > 0;
  const isDone = remaining === 0;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Timer className="h-4 w-4" />
        Rest Timer
      </h2>

      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => selectPreset(preset)}
            className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition ${
              seconds === preset
                ? "border-lime-500 bg-lime-500/20 text-lime-300"
                : "border-white/10 text-zinc-400"
            }`}
          >
            {preset}s
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-32 w-32 items-center justify-center sm:h-24 sm:w-24">
          <svg className="absolute inset-0" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="42" stroke="#27272a" strokeWidth="8" />
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke={isDone ? "#ef4444" : isLow ? "#f59e0b" : "#84cc16"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              transform="rotate(-90 48 48)"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <span
            className={`font-mono text-3xl font-semibold sm:text-2xl ${
              isDone ? "text-red-400" : isLow ? "text-amber-400" : "text-white"
            }`}
          >
            {isDone ? "Done" : `${mins}:${String(secs).padStart(2, "0")}`}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((current) => !current)}
            className="inline-flex items-center gap-2 rounded-2xl bg-lime-500 px-8 py-4 text-base font-bold text-black transition-transform active:scale-95"
          >
            {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl border border-white/10 px-4 py-4 text-zinc-400 hover:text-white"
            aria-label="Reset rest timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600">Target: 90-120 sec between sets</p>
    </section>
  );
}
