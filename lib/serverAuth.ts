import { cookies } from "next/headers";

const enc = new TextEncoder();

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

async function hmac(message: string): Promise<string> {
  const secret = getEnv("SESSION_SECRET");
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

export interface SessionPayload {
  user: string;
  iat: number; // issued at (ms)
}

export async function createSession(user: string): Promise<string> {
  const payload: SessionPayload = { user, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmac(body);
  if (sig !== expected) return null;
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("smarthome_session")?.value;
  return verifySession(token);
}

export function sessionCookieOptions(maxAgeDays = 30): string {
  const maxAge = maxAgeDays * 24 * 60 * 60; // seconds
  // HttpOnly to prevent JS access; Secure true assumed on Vercel; SameSite=Lax ok for this app
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; ${process.env.NODE_ENV === "development" ? "" : "Secure"}`.trim();
}

/**
 * Verify authentication via either:
 * 1. Session cookie (dashboard/browser users)
 * 2. PI_AUTH_KEY header (Pi script)
 */
export async function verifyAuth(req: Request): Promise<{ authenticated: boolean; method?: 'session' | 'api-key' }> {
  // Check 1: Session cookie (dashboard)
  const session = await getServerSession();
  if (session) {
    return { authenticated: true, method: 'session' };
  }

  // Check 2: PI_AUTH_KEY header (Pi script)
  const apiKey = req.headers.get('x-pi-auth-key');
  const validApiKey = process.env.PI_AUTH_KEY;
  
  if (apiKey && validApiKey && apiKey === validApiKey) {
    return { authenticated: true, method: 'api-key' };
  }

  return { authenticated: false };
}
