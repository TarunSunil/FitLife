import FitnessShell from "@/components/FitnessShell";
import { fetchPageData } from "@/lib/data/fetchPageData";

export default async function WorkoutLogsRoute() {
  const data = await fetchPageData();

  return (
    <FitnessShell
      {...data}
      mode="workout-logs"
    />
  );
}
