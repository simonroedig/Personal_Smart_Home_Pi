import { NextResponse } from "next/server";
import { createSession, sessionCookieOptions } from "../../../../lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({ username: "", password: "" }));

  const envUser = process.env.AUTH_USERNAME ?? "";
  const envPass = process.env.AUTH_PASSWORD ?? "";

  if (username !== envUser || password !== envPass) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession(username);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `smarthome_session=${token}; ${sessionCookieOptions(30)}`);
  return res;
}
