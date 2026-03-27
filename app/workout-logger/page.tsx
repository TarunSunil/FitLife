import FitnessShell from "@/components/FitnessShell";
import {
  getMealLogs,
  getProfile,
  getWeeklyPlan,
  getWorkoutLogs,
} from "@/lib/data/fitnessStore";

export default async function WorkoutLoggerRoute() {
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
      mode="workout-logger"
    />
  );
}
