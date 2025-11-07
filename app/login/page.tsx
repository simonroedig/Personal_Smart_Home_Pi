import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "../../lib/serverAuth";
import LoginClient from "../components/LoginClient";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("smarthome_session")?.value;
  const session = await verifySession(token);
  if (session) redirect("/dashboard");
  return <LoginClient />;
}
