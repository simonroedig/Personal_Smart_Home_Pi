"use client";

import { useMemo } from "react";

export type CameraState = "on" | "off" | "loading";

export function CameraControls(props: {
  state: CameraState;
  onTurnOn: () => void;
  onTurnOff: () => void;
  lastUpdated?: Date | null;
  busy?: boolean;
}) {
  const { state, onTurnOn, onTurnOff, lastUpdated, busy } = props;

  const badge = useMemo(() => {
    if (state === "loading") return { label: "Loading", cls: "bg-zinc-700 text-zinc-200" };
    return state === "on"
      ? { label: "ON", cls: "bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/40" }
      : { label: "OFF", cls: "bg-zinc-800 text-zinc-300 ring-1 ring-inset ring-zinc-600/40" };
  }, [state]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Camera</h2>
          <p className="text-sm text-zinc-400">Control and status</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onTurnOn}
          disabled={busy || state === "on"}
          className="rounded-lg px-4 py-3 font-medium bg-emerald-500/90 hover:bg-emerald-400 text-black disabled:opacity-60"
        >
          Turn ON
        </button>
        <button
          onClick={onTurnOff}
          disabled={busy || state === "off"}
          className="rounded-lg px-4 py-3 font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10 disabled:opacity-60"
        >
          Turn OFF
        </button>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : ""}
      </div>
    </div>
  );
}

export default CameraControls;
