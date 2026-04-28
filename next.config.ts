import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },
};

export default nextConfig;
