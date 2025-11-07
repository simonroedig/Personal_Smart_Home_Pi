"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CameraControls, { CameraState } from "./CameraControls";

type ApiResponse = { camera: "on" | "off" } | { error: string };

const POLL_MS = 60_000; // 1 minute polling

export default function DashboardClient() {
  const router = useRouter();
  const [state, setState] = useState<CameraState>("loading");
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data: ApiResponse = await res.json();
        if (!cancelled && "camera" in data) {
          setState(data.camera);
          setLastUpdated(new Date());
        }
      } catch {
        // ignore
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const postState = async (newState: "on" | "off") => {
    setBusy(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      const data: ApiResponse = await res.json();
      if ("camera" in data) {
        setState(data.camera);
        setLastUpdated(new Date());
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f12] text-zinc-100">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.6)]" />
            <span className="font-semibold tracking-tight">Simon&apos;s Smart Home Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <button
              onClick={() => {
                fetch("/api/auth/logout", { method: "POST" }).finally(() => router.replace("/login"));
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-6">
          <CameraControls
            state={state}
            busy={busy}
            lastUpdated={lastUpdated}
            onTurnOn={() => postState("on")}
            onTurnOff={() => postState("off")}
          />

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold mb-2">Raspberry Pi polling</h3>
            <p className="text-sm text-zinc-400">
              The endpoint <code className="text-zinc-300">/api/state</code> is polled every 60 seconds. Raspberry Pi should use GET to read and POST to update.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
