import {
  getMealLogs,
  getProfile,
  getQuickBundles,
  getSavedFoods,
  getWeeklyPlan,
  getWorkoutLogs,
} from "./fitnessStore";

export async function fetchPageData() {
  const [initialProfile, initialLogs, initialMealLogs, initialWeeklyPlan, initialSavedFoods, initialQuickBundles] =
    await Promise.all([
      getProfile(),
      getWorkoutLogs(),
      getMealLogs(),
      getWeeklyPlan(),
      getSavedFoods(),
      getQuickBundles(),
    ]);

  return {
    initialProfile,
    initialLogs,
    initialMealLogs,
    initialWeeklyPlan,
    initialSavedFoods,
    initialQuickBundles,
  };
}
