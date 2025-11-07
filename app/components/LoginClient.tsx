"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Invalid credentials");
        return r.json();
      })
      .then(() => router.replace("/dashboard"))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#0b0f12] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl p-8">
        <div className="mb-8 text-center">
          <Image
            src="/icon.png"
            alt="Smart Home Icon"
            width={80}
            height={80}
            priority
            className="mx-auto mb-3 drop-shadow-sm"
          />
          <h1 className="text-2xl font-semibold tracking-tight">Simon&apos;s Smart Home<br/>Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Username"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-black font-medium px-4 py-2.5 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
