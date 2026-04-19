import type { Metadata } from "next";
import { Inter, Space_Grotesk, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-ultra",
  subsets: ["latin"],
  weight: ["700", "800"],
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${bricolage.variable} h-full antialiased`}
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
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] text-gray-900 dark:text-gray-100">{children}</body>
    </html>
  );
}
