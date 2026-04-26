"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/app/button";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    // Auth.js v5 signout endpoint requires a CSRF token.
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/admin/login" }).toString(),
    });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" onClick={logout} className="w-full justify-start">
      Log out
    </Button>
  );
}
