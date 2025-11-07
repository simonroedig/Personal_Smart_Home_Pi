import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "../../lib/serverAuth";
import DashboardClient from "../components/DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("smarthome_session")?.value;
  const session = await verifySession(token);
  if (!session) redirect("/login");
  return <DashboardClient />;
}
