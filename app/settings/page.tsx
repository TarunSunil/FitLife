import FitnessShell from "@/components/FitnessShell";
import { fetchPageData } from "@/lib/data/fetchPageData";

export default async function SettingsRoute() {
  const data = await fetchPageData();

  return (
    <FitnessShell
      {...data}
      mode="settings"
    />
  );
}
