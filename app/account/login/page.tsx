import { Suspense } from "react";
import AccountLoginForm from "./AccountLoginForm";

export const dynamic = "force-dynamic";

async function getProviders(): Promise<{ id: string; name: string }[]> {
  try {
    const h = await import("next/headers").then((m) => m.headers());
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const res = await fetch(`${proto}://${host}/api/auth/providers`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, { id: string; name: string }>;
    return Object.values(data);
  } catch {
    return [];
  }
}

export default async function AccountLoginPage() {
  const providers = await getProviders();
  return (
    <Suspense fallback={null}>
      <AccountLoginForm providers={providers} />
    </Suspense>
  );
}
