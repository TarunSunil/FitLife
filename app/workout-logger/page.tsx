import FitnessShell from "@/components/FitnessShell";
import { fetchPageData } from "@/lib/data/fetchPageData";

export default async function WorkoutLoggerRoute() {
  const data = await fetchPageData();

  return (
    <FitnessShell
      {...data}
      mode="workout-logger"
    />
  );
}
