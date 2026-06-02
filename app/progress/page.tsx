import FitnessShell from "@/components/FitnessShell";
import { fetchPageData } from "@/lib/data/fetchPageData";
import { getBodyWeightLogs } from "@/lib/data/fitnessStore";

export default async function ProgressRoute() {
  const [data, initialBodyWeightLogs] = await Promise.all([
    fetchPageData(),
    getBodyWeightLogs(),
  ]);

  return (
    <FitnessShell
      {...data}
      initialBodyWeightLogs={initialBodyWeightLogs}
      mode="progress"
    />
  );
}
