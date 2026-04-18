import type { Metadata } from "next";
import { Inter, Space_Grotesk, Ultra } from "next/font/google";
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

const ultra = Ultra({
  variable: "--font-ultra",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Philly MTG",
  description: "Find Magic: The Gathering events near Philadelphia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${ultra.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">{children}</body>
    </html>
  );
}
