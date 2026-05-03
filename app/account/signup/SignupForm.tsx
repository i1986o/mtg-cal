"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/button";
import { PlayIrlLogo } from "@/app/playirl-logo";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-950 p-4 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to PlayIRL.GG
      </Link>
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl shadow-md dark:shadow-gray-800 w-full max-w-sm border border-transparent dark:border-neutral-700 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 flex items-baseline justify-center gap-2 flex-wrap">
            Create an account on
            <PlayIrlLogo className="inline-block h-5 w-auto" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Email + password. Or use the OAuth buttons on the sign-in page.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-2">
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name (optional)"
            autoComplete="name"
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-white/20"
          />
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-white/20"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ chars, letter + number)"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-white/20"
          />
          <input
            type="password"
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-white/20"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href={`/account/login${from !== "/account" ? `?from=${encodeURIComponent(from)}` : ""}`} className="underline hover:text-gray-700 dark:hover:text-gray-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
