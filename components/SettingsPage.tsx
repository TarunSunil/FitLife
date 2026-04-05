"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dumbbell, Flame, Refrigerator, Target, ThermometerSun } from "lucide-react";

import { updateSettingsAction } from "@/app/actions";
import { getShoppingList } from "@/lib/domain/profileRules";
import { enqueue } from "@/lib/offlineQueue";
import type { FitnessProfile } from "@/lib/types/fitness";

type SettingsInput = {
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

type SettingsPageProps = {
  profile: FitnessProfile;
  onProfileChange: (nextProfile: FitnessProfile) => void;
};

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-lime-500" : "bg-white/20"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition ${
            checked ? "left-[1.45rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage({ profile, onProfileChange }: SettingsPageProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SettingsInput>({
    has_squat_rack: profile.has_squat_rack,
    has_pullup_bar: profile.has_pullup_bar,
    has_bench: profile.has_bench,
    has_fridge: profile.has_fridge,
    has_kettle: profile.has_kettle,
    max_db_weight_kg: profile.max_db_weight_kg,
    target_calories: profile.target_calories,
    target_protein: profile.target_protein,
    hidden_calorie_buffer_percent: profile.hidden_calorie_buffer_percent,
  });

  useEffect(() => {
    setDraft({
      has_squat_rack: profile.has_squat_rack,
      has_pullup_bar: profile.has_pullup_bar,
      has_bench: profile.has_bench,
      has_fridge: profile.has_fridge,
      has_kettle: profile.has_kettle,
      max_db_weight_kg: profile.max_db_weight_kg,
      target_calories: profile.target_calories,
      target_protein: profile.target_protein,
      hidden_calorie_buffer_percent: profile.hidden_calorie_buffer_percent,
    });
  }, [profile]);

  const shoppingItems = useMemo(
    () => getShoppingList({ ...profile, ...draft }),
    [profile, draft],
  );

  const patch = (next: Partial<SettingsInput>) => {
    setDraft((previous) => ({ ...previous, ...next }));
  };

  const save = () => {
    setError(null);

    const optimisticProfile: FitnessProfile = {
      ...profile,
      ...draft,
      updated_at: new Date().toISOString(),
    };

    onProfileChange(optimisticProfile);

    startTransition(async () => {
      try {
        const result = await updateSettingsAction(draft);

        if (!result.ok || !result.profile) {
          setError(result.error ?? "Unable to save settings");
          return;
        }

        onProfileChange(result.profile);
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueue({
            type: "settings",
            payload: draft,
          });
          setError("Offline: queued settings change for sync");
          return;
        }

        setError("Unable to save settings right now. Please try again.");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Dumbbell className="h-4 w-4" />
          Settings
        </h2>
        <p className="text-xs text-zinc-400">Environment profile controls app behavior.</p>
      </header>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Gym Equipment
        </h3>
        <ToggleRow
          label="Squat Rack"
          checked={draft.has_squat_rack}
          onChange={(has_squat_rack) => patch({ has_squat_rack })}
        />
        <ToggleRow
          label="Pull-up Bar"
          checked={draft.has_pullup_bar}
          onChange={(has_pullup_bar) => patch({ has_pullup_bar })}
        />
        <ToggleRow
          label="Bench"
          checked={draft.has_bench}
          onChange={(has_bench) => patch({ has_bench })}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Kitchen Gear
        </h3>
        <ToggleRow
          label="Fridge"
          checked={draft.has_fridge}
          onChange={(has_fridge) => patch({ has_fridge })}
        />
        <ToggleRow
          label="Kettle"
          checked={draft.has_kettle}
          onChange={(has_kettle) => patch({ has_kettle })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <span className="mb-2 flex items-center gap-2 text-zinc-300">
            <Flame className="h-4 w-4" />
            Target Calories
          </span>
          <input
            type="number"
            value={draft.target_calories}
            min={900}
            max={7000}
            onChange={(event) => patch({ target_calories: Number(event.target.value) || 0 })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-lime-500"
          />
        </label>

        <label className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <span className="mb-2 flex items-center gap-2 text-zinc-300">
            <Target className="h-4 w-4" />
            Target Protein (g)
          </span>
          <input
            type="number"
            value={draft.target_protein}
            min={30}
            max={400}
            onChange={(event) => patch({ target_protein: Number(event.target.value) || 0 })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-lime-500"
          />
        </label>
      </div>

      <label className="block rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
        <span className="mb-2 flex items-center gap-2 text-zinc-300">
          <ThermometerSun className="h-4 w-4" />
          Max Dumbbell Weight (kg)
        </span>
        <input
          type="number"
          value={draft.max_db_weight_kg}
          min={1}
          max={200}
          onChange={(event) => patch({ max_db_weight_kg: Number(event.target.value) || 1 })}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-lime-500"
        />
      </label>

      <label className="block rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
        <span className="mb-2 flex items-center justify-between gap-2 text-zinc-300">
          <span>Hidden Calorie Buffer (%)</span>
          <strong className="text-lime-300">{draft.hidden_calorie_buffer_percent}%</strong>
        </span>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={draft.hidden_calorie_buffer_percent}
          onChange={(event) =>
            patch({ hidden_calorie_buffer_percent: Number(event.target.value) || 0 })
          }
          className="w-full accent-lime-500"
        />
        <p className="mt-2 text-xs text-zinc-400">
          Adds this percentage to calories from meals marked as Outside Food.
        </p>
      </label>

      <div className="rounded-xl border border-white/10 bg-black p-3 text-sm">
        <p className="mb-2 flex items-center gap-2 text-zinc-300">
          <Refrigerator className="h-4 w-4" />
          Shopping List Context
        </p>
        <ul className="flex flex-wrap gap-2 text-xs">
          {shoppingItems.map((item) => (
            <li key={item} className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="w-full rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-400 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Settings"}
      </button>
    </section>
  );
}
