import { redirect } from "next/navigation";

export default async function WorkoutsRoute() {
  redirect("/workout-logger");
}
