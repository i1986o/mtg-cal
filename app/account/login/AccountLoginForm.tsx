"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/button";
import OAuthButton from "@/app/oauth-button";
import { PlayIrlLogo } from "@/app/playirl-logo";

interface Provider { id: string; name: string }

export default function AccountLoginForm({ providers }: { providers: Provider[] }) {
  const [email, setEmail] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/account";

  useEffect(() => {
    fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.csrfToken));
  }, []);

  const hasOAuth = providers.some((p) => p.id === "discord" || p.id === "google");
  const hasEmail = providers.some((p) => p.id === "resend");
  const noProviders = providers.length === 0;
  const oauthAction = (id: string) => `/api/auth/signin/${id}`;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-stone-950 p-4 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to PlayIRL.GG
      </Link>
      <div className="bg-white dark:bg-stone-900 p-8 rounded-xl shadow-md dark:shadow-gray-800 w-full max-w-sm border border-transparent dark:border-stone-700 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100 flex items-baseline justify-center gap-2 flex-wrap">
            Welcome to
            <PlayIrlLogo className="inline-block h-5 w-auto" />
            <span className="sr-only">PlayIRL.GG</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Submit your own events and sync with Discord — pull events from a server, or publish PlayIRL events to one.
          </p>
        </div>

        {noProviders && (
          <div className="text-center text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            No sign-in providers configured. Add Auth.js env vars (Discord / Google / Resend).
          </div>
        )}

        {hasOAuth && (
          <div className="space-y-2">
            {providers.filter((p) => p.id === "google").map((p) => (
              <OAuthButton key={p.id} provider="google" action={oauthAction(p.id)} csrfToken={csrfToken} callbackUrl={from} />
            ))}
            {providers.filter((p) => p.id === "discord").map((p) => (
              <OAuthButton key={p.id} provider="discord" action={oauthAction(p.id)} csrfToken={csrfToken} callbackUrl={from} />
            ))}
          </div>
        )}

        {hasEmail && (
          <>
            {hasOAuth && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-stone-700" />
                <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-stone-700" />
              </div>
            )}
            <form action={oauthAction("resend")} method="POST" className="space-y-2">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value={from} />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" variant="primary" disabled={!csrfToken} className="w-full">
                Email me a sign-in link
              </Button>
            </form>
          </>
        )}

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed">
          New here? Pick a provider above — we&rsquo;ll create your account automatically. Or{" "}
          <Link href="/" className="underline hover:text-gray-700 dark:hover:text-gray-300">browse events first</Link>.
        </p>
      </div>
    </main>
  );
}
