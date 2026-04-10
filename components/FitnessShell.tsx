"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenText,
  DatabaseZap,
  ListChecks,
  Salad,
  Signal,
  SignalHigh,
  Target,
} from "lucide-react";

import { replayOfflineQueueAction } from "@/app/actions";
import AppTopNav from "@/components/AppTopNav";
import DietPlanPage from "@/components/DietPlanPage";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProgressCharts from "@/components/ProgressCharts";
import PWARegistrar from "@/components/PWARegistrar";
import SettingsPage from "@/components/SettingsPage";
import WorkoutLogsList from "@/components/WorkoutLogsList";
import WorkoutLogger from "@/components/WorkoutLogger";
import { clearQueue, readQueue } from "@/lib/offlineQueue";
import type { FitnessProfile, WorkoutLog } from "@/lib/types/fitness";
import type { MealLog, WeeklyPlanEntry } from "@/lib/types/nutrition";

const PROFILE_SYNC_KEY = "fitlife:profile";
const PREFERENCES_SYNC_KEY = "fitlife:preferences";

type AppPreferences = {
  deletion_confirmation_enabled: boolean;
};

function readStoredProfile(): FitnessProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_SYNC_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as FitnessProfile;
  } catch {
    return null;
  }
}

function readStoredPreferences(): AppPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_SYNC_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AppPreferences;
  } catch {
    return null;
  }
}

type FitnessShellProps = {
  initialProfile: FitnessProfile;
  initialLogs: WorkoutLog[];
  initialMealLogs: MealLog[];
  initialWeeklyPlan: WeeklyPlanEntry[];
  mode:
    | "dashboard"
    | "settings"
    | "workout-logger"
    | "workout-logs"
    | "diet-plan";
};

export default function FitnessShell({
  initialProfile,
  initialLogs,
  initialMealLogs,
  initialWeeklyPlan,
  mode,
}: FitnessShellProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [logs, setLogs] = useState(initialLogs);
  const [mealLogs, setMealLogs] = useState(initialMealLogs);
  const [weeklyPlan, setWeeklyPlan] = useState(initialWeeklyPlan);
  const [preferences, setPreferences] = useState<AppPreferences>({
    deletion_confirmation_enabled: true,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Synced");

  const syncProfile = useCallback((nextProfile: FitnessProfile) => {
    setProfile(nextProfile);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_SYNC_KEY, JSON.stringify(nextProfile));
    }
  }, []);

  const syncPreferences = useCallback((nextPreferences: AppPreferences) => {
    setPreferences(nextPreferences);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFERENCES_SYNC_KEY, JSON.stringify(nextPreferences));
    }
  }, []);

  useEffect(() => {
    const storedProfile = readStoredProfile();

    if (!storedProfile) {
      return;
    }

    const incomingTimestamp = Date.parse(storedProfile.updated_at);
    const currentTimestamp = Date.parse(initialProfile.updated_at);

    if (!Number.isNaN(incomingTimestamp) && incomingTimestamp > currentTimestamp) {
      setProfile(storedProfile);
      return;
    }

    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    const storedPreferences = readStoredPreferences();

    if (storedPreferences) {
      setPreferences(storedPreferences);
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROFILE_SYNC_KEY && event.newValue) {
        try {
          const nextProfile = JSON.parse(event.newValue) as FitnessProfile;
          setProfile((current) => {
            const nextTimestamp = Date.parse(nextProfile.updated_at);
            const currentTimestamp = Date.parse(current.updated_at);

            if (!Number.isNaN(nextTimestamp) && !Number.isNaN(currentTimestamp)) {
              return nextTimestamp >= currentTimestamp ? nextProfile : current;
            }

            return nextProfile;
          });
        } catch {
          // Ignore malformed storage payloads.
        }

        return;
      }

      if (event.key === PREFERENCES_SYNC_KEY && event.newValue) {
        try {
          const nextPreferences = JSON.parse(event.newValue) as AppPreferences;
          setPreferences(nextPreferences);
        } catch {
          // Ignore malformed storage payloads.
        }
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    const queue = readQueue();

    if (!queue.length) {
      setSyncStatus("Synced");
      return;
    }

    setSyncStatus("Syncing queued changes...");

    const result = await replayOfflineQueueAction(queue);

    if (result.synced > 0) {
      clearQueue();
    }

    setSyncStatus(
      result.errors.length ? "Partial sync: check network/data" : `Synced ${result.synced} changes`,
    );
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    if (navigator.onLine) {
      syncOfflineQueue().catch(() => {
        setSyncStatus("Unable to sync queued changes");
      });
    }
  }, [syncOfflineQueue]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncOfflineQueue().catch(() => {
        setSyncStatus("Unable to sync queued changes");
      });
    };

    const onOffline = () => {
      setIsOnline(false);
      setSyncStatus("Offline mode");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncOfflineQueue]);

  const todayVolume = useMemo(
    () =>
      logs.reduce((sum, log) => {
        const volume = log.reps * log.weight_kg;
        return sum + volume;
      }, 0),
    [logs],
  );

  const statsPanel = (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <h2 className="text-lg font-semibold text-white">Stats</h2>
      <div className="space-y-2 text-sm text-zinc-300">
        <p className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
          <span>Workout Logs</span>
          <strong>{logs.length}</strong>
        </p>
        <p className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
          <span>Total Volume</span>
          <strong>{Math.round(todayVolume)} kg</strong>
        </p>
        <p className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
          <span className="inline-flex items-center gap-1">
            <Target className="h-4 w-4" />
            Calories Target
          </span>
          <strong>{profile.target_calories}</strong>
        </p>
        <p className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
          <span>Protein Target</span>
          <strong>{profile.target_protein}g</strong>
        </p>
        <p className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
          <span>Meal Logs</span>
          <strong>{mealLogs.length}</strong>
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300">
        <p className="flex items-center gap-2">
          <DatabaseZap className="h-4 w-4" />
          {syncStatus}
        </p>
        <p className="mt-1 flex items-center gap-2 text-zinc-400">
          {isOnline ? <SignalHigh className="h-4 w-4" /> : <Signal className="h-4 w-4" />}
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>
    </section>
  );

  const dashboardLinks = (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
      <h2 className="text-base font-semibold text-white">Quick Access</h2>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <Link
          href="/workout-logs"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-zinc-300 hover:text-white"
        >
          <ListChecks className="h-4 w-4" />
          Workout Logs
        </Link>
        <Link
          href="/diet"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-zinc-300 hover:text-white"
        >
          <Salad className="h-4 w-4" />
          Diet Plan
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-zinc-300 hover:text-white"
        >
          <BookOpenText className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </section>
  );

  return (
    <>
      <PWARegistrar />
      <AppTopNav />

      {mode === "workout-logger" ? (
        <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-6">
          <WorkoutLogger profile={profile} onLogAdded={(log) => setLogs((curr) => [...curr, log])} />
          <ProgressCharts profile={profile} logs={logs} mealLogs={mealLogs} />
        </div>
      ) : null}

      {mode === "workout-logs" ? (
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
          <WorkoutLogsList
            logs={logs}
            onLogUpdated={(updated) =>
              setLogs((current) =>
                current.map((log) => (log.id === updated.id ? updated : log)),
              )
            }
            onLogDeleted={(logId) =>
              setLogs((current) => current.filter((log) => log.id !== logId))
            }
          />
        </div>
      ) : null}

      {mode === "diet-plan" ? (
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
          <DietPlanPage
            profile={profile}
            mealLogs={mealLogs}
            weeklyPlan={weeklyPlan}
            deletionConfirmationEnabled={preferences.deletion_confirmation_enabled}
            onMealAdded={(meal) => setMealLogs((current) => [meal, ...current])}
            onMealDeleted={(mealId) =>
              setMealLogs((current) => current.filter((meal) => meal.id !== mealId))
            }
            onPlanUpserted={(entry) =>
              setWeeklyPlan((current) => {
                const isClearedEntry =
                  entry.meal_name.trim().length === 0 &&
                  entry.calories === 0 &&
                  entry.protein === 0 &&
                  (!entry.ingredients || entry.ingredients.length === 0);

                if (isClearedEntry) {
                  return current.filter(
                    (item) => !(item.day === entry.day && item.slot === entry.slot),
                  );
                }

                const index = current.findIndex((item) => item.id === entry.id);

                if (index === -1) {
                  return [...current, entry];
                }

                const next = [...current];
                next[index] = entry;
                return next;
              })
            }
          />
        </div>
      ) : null}

      {mode === "settings" ? (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
          <SettingsPage
            profile={profile}
            onProfileChange={syncProfile}
            deletionConfirmationEnabled={preferences.deletion_confirmation_enabled}
            onDeletionConfirmationChange={(next) =>
              syncPreferences({
                ...preferences,
                deletion_confirmation_enabled: next,
              })
            }
          />
        </div>
      ) : null}

      {mode === "dashboard" ? (
        <main className="min-h-screen px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8">
          <div className="mx-auto max-w-screen-2xl md:grid md:grid-cols-[1fr_1.2fr_1.2fr] md:gap-4">
            <div className="space-y-4">
              {statsPanel}
              {dashboardLinks}
            </div>

            <div className="mt-4 md:mt-0">
              <WorkoutLogger profile={profile} onLogAdded={(log) => setLogs((curr) => [...curr, log])} />
            </div>

            <div className="mt-4 md:mt-0">
              <ProgressCharts profile={profile} logs={logs} mealLogs={mealLogs} />
            </div>
          </div>

          <div className="mt-4 md:hidden">
            <ProgressCharts profile={profile} logs={logs} mealLogs={mealLogs} />
          </div>
        </main>
      ) : null}

      <MobileBottomNav />
    </>
  );
}
