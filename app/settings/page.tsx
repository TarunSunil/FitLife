import FitnessShell from "@/components/FitnessShell";
import {
  getMealLogs,
  getProfile,
  getWeeklyPlan,
  getWorkoutLogs,
} from "@/lib/data/fitnessStore";

export default async function SettingsRoute() {
  const [profile, logs, meals, weeklyPlan] = await Promise.all([
    getProfile(),
    getWorkoutLogs(),
    getMealLogs(),
    getWeeklyPlan(),
  ]);

  return (
    <FitnessShell
      initialProfile={profile}
      initialLogs={logs}
      initialMealLogs={meals}
      initialWeeklyPlan={weeklyPlan}
      mode="settings"
    />
  );
}
