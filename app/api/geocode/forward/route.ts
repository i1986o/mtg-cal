// Forward geocode for the homepage location picker. Wraps the existing
// lib/geocode.ts geocodeAddress() (Google → Nominatim fallback). Rate-
// limited per IP and cached in-memory by query so repeated picker
// keystrokes don't burn through provider budgets.

import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CacheEntry {
  fetchedAt: number;
  result: { latitude: number; longitude: number; label: string } | null;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60_000;

interface RateState { count: number; resetAt: number }
const rateLimit = new Map<string, RateState>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30; // forward queries per minute per IP

function rateOk(ip: string): boolean {
  const now = Date.now();
  const cur = rateLimit.get(ip);
  if (!cur || cur.resetAt < now) {
    rateLimit.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  cur.count++;
  return cur.count <= RL_MAX;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });
  if (q.length > 200) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateOk(`geocode-fwd:${ip}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // In-memory cache: same query string within 5 min returns the same result.
  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.result ?? { error: "No matches" }, {
      status: cached.result ? 200 : 404,
    });
  }

  const hit = await geocodeAddress(q);
  if (!hit) {
    cache.set(key, { fetchedAt: Date.now(), result: null });
    return NextResponse.json({ error: "No matches" }, { status: 404 });
  }
  const result = {
    latitude: hit.latitude,
    longitude: hit.longitude,
    // We echo the user's query as the label — the picker prefers the human
    // typed string over Google's longer formatted_address most of the time.
    label: q,
  };
  cache.set(key, { fetchedAt: Date.now(), result });
  return NextResponse.json(result);
}
