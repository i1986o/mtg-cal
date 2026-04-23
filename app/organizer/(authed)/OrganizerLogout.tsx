"use client";
import { useRouter } from "next/navigation";

export default function OrganizerLogout() {
  const router = useRouter();
  async function logout() {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/organizer/login" }).toString(),
    });
    router.push("/organizer/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="w-full text-xs px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
    >
      Log out
    </button>
  );
}
