import type { Metadata } from "next";
import { Inter, Stack_Sans_Notch } from "next/font/google";
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

export const metadata: Metadata = {
  title: "PlayIRL.GG",
  description: "Find Magic: The Gathering events near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${stackSansNotch.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] text-gray-900 dark:text-gray-100">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
