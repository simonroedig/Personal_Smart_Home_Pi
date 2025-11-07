import { NextResponse } from "next/server";

// Pattern A: Maintain desired target (from dashboard) and actual (reported by Pi).
// Note: In-memory only; resets on cold starts in serverless environments like Vercel.
type OnOff = "on" | "off";
type StateDoc = {
  target: OnOff;
  actual: OnOff;
  updatedAt: number; // when target last changed
  reportedAt: number; // when actual last reported
};

const state: StateDoc = {
  target: "off",
  actual: "off",
  updatedAt: Date.now(),
  reportedAt: Date.now(),
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache, always compute on request
export const revalidate = 0;

interface ApiResponse {
  error?: string;
  target?: OnOff;
  actual?: OnOff;
  updatedAt?: number;
  reportedAt?: number;
}

function json(data: ApiResponse, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store");
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

export async function GET() {
  return json(state);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Back-compat: allow {state:"on"|"off"} to set target
    if (typeof body["state"] === "string") {
      const s = body["state"] as string;
      if (s !== "on" && s !== "off") return json({ error: "Invalid state" }, { status: 400 });
      state.target = s;
      state.updatedAt = Date.now();
      return json(state);
    }

    const action = typeof body["action"] === "string" ? (body["action"] as string) : "";

    if (action === "set-target") {
      const t = body["target"];
      if (t !== "on" && t !== "off") return json({ error: "Invalid target" }, { status: 400 });
      state.target = t;
      state.updatedAt = Date.now();
      return json(state);
    }

    if (action === "report-actual") {
      const a = body["actual"];
      if (a !== "on" && a !== "off") return json({ error: "Invalid actual" }, { status: 400 });
      state.actual = a;
      state.reportedAt = Date.now();
      return json(state);
    }

    return json({ error: "Invalid payload" }, { status: 400 });
  } catch {
    return json({ error: "Bad Request" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return json({}, { status: 204 });
}
