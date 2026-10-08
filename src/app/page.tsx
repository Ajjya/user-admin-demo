import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/dal";

/** No UI: signed-in users go to the dashboard; everyone else sees sign-up by default. */
export default async function Home(): Promise<never> {
  redirect((await getSession()) ? "/dashboard" : "/sign-up");
}
