// Next.js App Router robots.txt generator. Renders to /robots.txt.
//
// Strategy: allow indexing of all public marketing + event detail pages;
// explicitly disallow the auth-gated areas and API surfaces. Search engines
// shouldn't burn crawl budget on /admin/* (they get a 401 anyway), and
// /api/* responses are JSON not HTML — no SEO value.

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/account", "/account/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
