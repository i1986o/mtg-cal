import type { Metadata } from "next";
import { Inter, Stack_Sans_Notch } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import ThemeSync from "./theme-sync";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const stackSansNotch = Stack_Sans_Notch({
  variable: "--font-ultra",
  subsets: ["latin"],
  weight: ["300", "400"],
});

const BUILD_SHA = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

export const metadata: Metadata = {
  title: "PlayIRL.GG",
  description: "Find Magic: The Gathering events near you",
  other: {
    "x-build-sha": BUILD_SHA,
    "x-build-feature": "bulk-retry-venues",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side theme detection. Reads the `theme` cookie that ThemeSync /
  // theme-toggle / floating-toolbar set on every change. SSR-applying the
  // `dark` class avoids the previous inline-script approach (which fired
  // React 19's "Encountered a script tag" warning every render). On the
  // first visit there's no cookie yet, so we render light and ThemeSync
  // re-applies the user's system preference on hydration; subsequent
  // visits read the cookie and SSR with no flash.
  const themeCookie = (await cookies()).get("theme")?.value;
  const isDark = themeCookie === "dark";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${stackSansNotch.variable} h-full antialiased${isDark ? " dark" : ""}`}
      style={{ colorScheme: isDark ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] text-gray-900 dark:text-gray-100">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
