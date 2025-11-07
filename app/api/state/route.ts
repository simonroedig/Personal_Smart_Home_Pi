import { NextResponse } from "next/server";

// In-memory camera state. Note: Will reset on cold starts in serverless environments like Vercel.
let cameraState: "on" | "off" = "off";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache, always compute on request
export const revalidate = 0;

interface ApiPayload {
  camera?: "on" | "off";
  state?: "on" | "off";
  error?: string;
  [key: string]: unknown;
}

function json(data: ApiPayload, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  // Allow simple polling from devices without CORS preflight complexity
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store");
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

export async function GET() {
  return json({ camera: cameraState });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = body?.state as string | undefined;
    if (state !== "on" && state !== "off") {
      return json({ error: "Invalid state. Use 'on' or 'off'." }, { status: 400 });
    }
    cameraState = state;
    return json({ camera: cameraState });
  } catch {
    return json({ error: "Bad Request" }, { status: 400 });
  }
}

// Optional: respond to OPTIONS for simple CORS scenario
export async function OPTIONS() {
  return json({}, { status: 204 });
}
