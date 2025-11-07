// Server-side and client helpers for cookie-based session auth.
// The actual credential comparison happens server-side using env vars.

export const AUTH_COOKIE = "smarthome_session";

export function parseCookie(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(/;\s*/).forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = decodeURIComponent(pair.slice(0, idx).trim());
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    out[k] = v;
  });
  return out;
}

export function clientHasSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${AUTH_COOKIE}=`);
}

