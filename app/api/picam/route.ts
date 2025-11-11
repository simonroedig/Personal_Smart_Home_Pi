import { NextResponse } from "next/server";
import { getCameraState, setCameraState, CameraState } from "@/lib/firebase";

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
  try {
    const cameraState = await getCameraState();
    return json({ camera: cameraState });
  } catch (error) {
    console.error('Error getting camera state:', error);
    return json({ error: "Failed to retrieve camera state" }, { status: 500 });
  }
}

type PostBody = { state?: "on" | "off" };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<PostBody>;
    const s = body?.state as PostBody["state"] | undefined;
    if (s !== "on" && s !== "off") {
      return json({ error: "Invalid state. Use 'on' or 'off'." }, { status: 400 });
    }
    const stateDoc = await setCameraState(s as CameraState);
    return json({ camera: stateDoc.camera });
  } catch (error) {
    console.error('Error setting camera state:', error);
    return json({ error: "Failed to update camera state" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return json({}, { status: 204 });
}
