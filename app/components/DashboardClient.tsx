"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CameraControls, { CameraState } from "./CameraControls";
type ApiResponse = { camera: "on" | "off" } | { error: string };

// No periodic dashboard polling needed now; Pi is the only poller.

export default function DashboardClient() {
  const router = useRouter();
  const [camState, setCamState] = useState<CameraState>("loading");
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/picam", { cache: "no-store" });
        const data: ApiResponse = await res.json();
        if (!cancelled && "camera" in data) {
          setCamState(data.camera);
          setLastUpdated(new Date());
        }
      } catch {}
    };

    // Load once on mount to sync with server
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDesired = async (next: "on" | "off") => {
    setBusy(true);
    try {
      const res = await fetch("/api/picam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      const data: ApiResponse = await res.json();
      if ("camera" in data) {
        setCamState(data.camera);
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
            <Image src="/icon.png" alt="Icon" width={30} height={30} className="rounded-sm" />
            <span className="font-semibold tracking-tight">Simon&apos;s Smart Home Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <button
              onClick={() => {
                fetch("/api/auth/logout", { method: "POST" }).finally(() => router.replace("/login"));
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-6">
          <CameraControls
            state={camState}
            busy={busy}
            lastUpdated={lastUpdated}
            onTurnOn={() => setDesired("on")}
            onTurnOff={() => setDesired("off")}
          />

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold mb-2">Raspberry Pi polling</h3>
            <p className="text-sm text-zinc-400">
              Pi polls <code className="text-zinc-300">/api/picam</code> with a GET about every 60 seconds and acts on the returned
              <code className="text-zinc-300"> {`{ camera: 'on' | 'off' }`}</code> value. The dashboard updates state instantly via POST when you toggle.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
