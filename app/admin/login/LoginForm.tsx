"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Provider { id: string; name: string }

export default function LoginForm({ providers }: { providers: Provider[] }) {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  // Auth.js v5 requires a CSRF token on every signin POST.
  useEffect(() => {
    fetch("/api/auth/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.csrfToken));
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(from);
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  }

  const hasOAuth = providers.some((p) => p.id === "discord" || p.id === "google");
  const hasEmail = providers.some((p) => p.id === "resend");
  const oauthAction = (id: string) => `/api/auth/signin/${id}`;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md dark:shadow-gray-800 w-full max-w-sm border border-transparent dark:border-gray-700 space-y-5">
        <h1 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-center text-gray-900 dark:text-gray-100">
          Sign in
        </h1>

        {hasOAuth && (
          <div className="space-y-2">
            {providers.filter((p) => p.id === "discord").map((p) => (
              <OAuthForm key={p.id} action={oauthAction(p.id)} csrfToken={csrfToken} callbackUrl={from} label={`Continue with ${p.name}`} color="#5865F2" />
            ))}
            {providers.filter((p) => p.id === "google").map((p) => (
              <OAuthForm key={p.id} action={oauthAction(p.id)} csrfToken={csrfToken} callbackUrl={from} label={`Continue with ${p.name}`} color="#4285F4" />
            ))}
          </div>
        )}

        {hasEmail && (
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
            <button
              type="submit"
              disabled={!csrfToken}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Email me a sign-in link
            </button>
          </form>
        )}

        {(hasOAuth || hasEmail) && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Admin password (legacy / break-glass)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus={!hasOAuth && !hasEmail}
            />
          </label>
          {error && <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition"
          >
            {loading ? "Logging in…" : "Log in with password"}
          </button>
        </form>
      </div>
    </main>
  );
}

function OAuthForm({ action, csrfToken, callbackUrl, label, color }: { action: string; csrfToken: string; callbackUrl: string; label: string; color: string }) {
  return (
    <form action={action} method="POST">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <button
        type="submit"
        disabled={!csrfToken}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: color }}
      >
        {label}
      </button>
    </form>
  );
}
