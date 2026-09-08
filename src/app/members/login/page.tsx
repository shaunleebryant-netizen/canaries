"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/members";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/members/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Incorrect password");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="members-password" className="text-sm font-medium text-slate-700">
        Members password
      </label>
      <input
        id="members-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-canary-gold"
        required
      />
      {error ? <p className="text-sm text-canary-red">{error}</p> : null}
      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
      >
        Enter members area
      </button>
      <p className="text-xs text-slate-400">
        Auth stub only — cookie gate via MEMBERS_PASSWORD. Not production-hardened.
      </p>
    </form>
  );
}

export default function MembersLoginPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center text-2xl font-semibold">Members login</h1>
      <Suspense fallback={<p className="mt-8 text-center text-sm text-slate-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
