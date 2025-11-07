import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Expire cookie immediately
  res.headers.set(
    "Set-Cookie",
    "smarthome_session=deleted; Path=/; HttpOnly; Max-Age=0; SameSite=Lax;" + (process.env.NODE_ENV === "development" ? "" : " Secure"),
  );
  return res;
}
