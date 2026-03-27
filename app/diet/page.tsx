import FitnessShell from "@/components/FitnessShell";
import {
  getQuickBundles,
  getSavedFoods,
  getMealLogs,
  getProfile,
  getWeeklyPlan,
  getWorkoutLogs,
} from "@/lib/data/fitnessStore";

export default async function DietRoute() {
  const [profile, logs, meals, weeklyPlan, savedFoods, quickBundles] = await Promise.all([
    getProfile(),
    getWorkoutLogs(),
    getMealLogs(),
    getWeeklyPlan(),
    getSavedFoods(),
    getQuickBundles(),
  ]);

  return (
    <FitnessShell
      initialProfile={profile}
      initialLogs={logs}
      initialMealLogs={meals}
      initialWeeklyPlan={weeklyPlan}
      initialSavedFoods={savedFoods}
      initialQuickBundles={quickBundles}
      mode="diet-plan"
    />
  );
}
