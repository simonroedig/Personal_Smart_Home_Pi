import { NextResponse } from "next/server";

// Simple Pi camera state (in-memory). Note: resets on server cold starts.
let cameraState: "on" | "off" = "off";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store");
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

export async function GET() {
  return json({ camera: cameraState });
}

type PostBody = { state?: "on" | "off" };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;
  const s = body?.state as PostBody["state"] | undefined;
  if (s !== "on" && s !== "off") {
    return json({ error: "Invalid state. Use 'on' or 'off'." }, { status: 400 });
  }
  cameraState = s;
  return json({ camera: cameraState });
}

export async function OPTIONS() {
  return json({}, { status: 204 });
}
