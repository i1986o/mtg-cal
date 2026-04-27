"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/app/button";
import OAuthButton from "@/app/oauth-button";

interface Provider { id: string; name: string }

export default function LoginForm({ providers }: { providers: Provider[] }) {
  const [email, setEmail] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  // Auth.js v5 requires a CSRF token on every signin POST.
  useEffect(() => {
    fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.csrfToken));
  }, []);

  const hasOAuth = providers.some((p) => p.id === "discord" || p.id === "google");
  const hasEmail = providers.some((p) => p.id === "resend");
  const noProviders = providers.length === 0;
  const oauthAction = (id: string) => `/api/auth/signin/${id}`;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to PlayIRL.GG
      </Link>
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md dark:shadow-gray-800 w-full max-w-sm border border-transparent dark:border-gray-700 space-y-6">
        <h1 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-center text-gray-900 dark:text-gray-100">
          Admin sign in
        </h1>

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
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
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
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" variant="primary" disabled={!csrfToken} className="w-full">
                Email me a sign-in link
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
