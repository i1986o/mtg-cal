// Production diagnostic — answers "why isn't the site showing nationwide
// events" without making the operator chase a 7-step runbook. Probes each
// layer (deploy / scrape / cron / data) and prints a single recommended
// next action.
//
// Usage:
//   npm run prod:diagnose                      # checks https://playirl.gg
//   SITE_URL=https://staging.playirl.gg npm run prod:diagnose
//   SCRAPE_SECRET=<value> npm run prod:diagnose # also probes the secret-gated paths
//
// Exits 0 if everything looks healthy and CONUS data is present. Exits
// non-zero with a specific recommendation otherwise. Designed to be safe
// to run repeatedly — only does GETs and one auth-required POST that's
// idempotent (returns 409 if a scrape is in flight).

// `export {}` makes this file a TS module so its top-level names don't
// collide with sibling cli/*.ts scripts during a project-wide tsc run.
export {};

const DEFAULT_SITE = "https://playirl.gg";
const NATIONWIDE_THRESHOLD = 1000; // event count below this = still Philly seed

interface Probe {
  ok: boolean;
  detail: string;
}

const PASS = "✓";
const FAIL = "✗";
const WARN = "⚠";

function pass(msg: string): Probe { return { ok: true, detail: `${PASS} ${msg}` }; }
function fail(msg: string): Probe { return { ok: false, detail: `${FAIL} ${msg}` }; }
function warn(msg: string): Probe { return { ok: true, detail: `${WARN} ${msg}` }; }

const siteUrl = process.env.SITE_URL ?? DEFAULT_SITE;
const scrapeSecret = process.env.SCRAPE_SECRET;

console.log(`\n🃏 Diagnosing ${siteUrl}\n`);

interface State {
  /** Set when fetch threw before getting any HTTP status — DNS, connection
   *  refused, TLS handshake, etc. Distinct from "site responded with 404". */
  unreachable: boolean;
  binaryHasHealth: boolean;
  eventCount: number;
  lastScrape: string | null;
  isNationwide: boolean;
  scrapeEndpointExists: boolean;
  scrapeSecretConfigured: boolean | null; // null = couldn't determine
  scrapeRunning: { since: string; source: string } | null;
}

const state: State = {
  unreachable: false,
  binaryHasHealth: false,
  eventCount: 0,
  lastScrape: null,
  isNationwide: false,
  scrapeEndpointExists: false,
  scrapeSecretConfigured: null,
  scrapeRunning: null,
};

// ── Probe 1: Is the new binary deployed? ───────────────────────────
// /api/health was added in this branch. If it returns a structured
// response, the new binary is live. Old binaries (pre-merge) 404 here.
async function probeHealthEndpoint(): Promise<Probe> {
  try {
    const res = await fetch(`${siteUrl}/api/health`);
    if (res.status === 404) {
      return fail(`/api/health returned 404 — new binary not deployed yet.`);
    }
    if (!res.ok) {
      return fail(`/api/health returned HTTP ${res.status}`);
    }
    const body = await res.json();
    if (typeof body.eventCount !== "number") {
      return fail(`/api/health response missing eventCount field — old binary?`);
    }
    state.binaryHasHealth = true;
    state.eventCount = body.eventCount;
    state.lastScrape = body.lastScrape ?? null;
    state.isNationwide = body.eventCount >= NATIONWIDE_THRESHOLD;
    return pass(
      `/api/health OK · ${body.eventCount} events · lastScrape=${body.lastScrape ?? "never"} · dbProbe=${body.dbProbeMs}ms`,
    );
  } catch (err: any) {
    state.unreachable = true;
    return fail(`Couldn't reach ${siteUrl}/api/health: ${err.message}`);
  }
}

// ── Probe 2: Does /api/scrape exist? ───────────────────────────────
// The fire-and-forget endpoint is the trigger path. It exists in main
// long-term, but the lock + status-probe semantics are new in this
// branch. We use a no-secret POST: 401 means the route exists with
// Phase-1 fixes; 500 with "SCRAPE_SECRET not configured" means the
// route exists but the env var hasn't been set yet; 404 means the
// branch isn't deployed.
async function probeScrapeEndpoint(): Promise<Probe> {
  try {
    const res = await fetch(`${siteUrl}/api/scrape`, { method: "POST" });
    if (res.status === 404) {
      return fail(`/api/scrape returned 404 — endpoint missing.`);
    }
    if (res.status === 500) {
      const body = await res.json().catch(() => ({}));
      if (typeof body.error === "string" && /SCRAPE_SECRET/.test(body.error)) {
        state.scrapeEndpointExists = true;
        state.scrapeSecretConfigured = false;
        return fail(`/api/scrape exists but SCRAPE_SECRET env var is not set on Railway.`);
      }
      return fail(`/api/scrape returned 500: ${JSON.stringify(body).slice(0, 100)}`);
    }
    if (res.status === 401) {
      state.scrapeEndpointExists = true;
      state.scrapeSecretConfigured = true;
      return pass(`/api/scrape exists, SCRAPE_SECRET is configured (401 without header — expected).`);
    }
    return warn(`/api/scrape returned unexpected status ${res.status}`);
  } catch (err: any) {
    return fail(`Couldn't reach /api/scrape: ${err.message}`);
  }
}

// ── Probe 3: Is a scrape in flight? ────────────────────────────────
// /api/admin/refresh GET returns the lock state. Admin-gated, so this
// only succeeds when the operator running the diagnostic is logged in
// (rare). It's a soft check — failure here is fine.
async function probeScrapeRunning(): Promise<Probe> {
  try {
    const res = await fetch(`${siteUrl}/api/admin/refresh`);
    if (res.status === 401) {
      return warn(`/api/admin/refresh requires auth — can't check live scrape status remotely.`);
    }
    if (!res.ok) {
      return warn(`/api/admin/refresh returned HTTP ${res.status}`);
    }
    const body = await res.json();
    if (body.running) {
      state.scrapeRunning = {
        since: body.running.runningSince,
        source: body.running.runningSource,
      };
      const elapsedMin = (Date.now() - new Date(body.running.runningSince).getTime()) / 60_000;
      return warn(`Scrape currently running (${body.running.runningSource}, ${elapsedMin.toFixed(1)}min elapsed).`);
    }
    return pass(`No scrape currently running.`);
  } catch (err: any) {
    return warn(`Couldn't probe live scrape status: ${err.message}`);
  }
}

// ── Probe 4: Is the SCRAPE_SECRET we have actually correct? ────────
// Only runs if SCRAPE_SECRET is exported locally. POST with the secret;
// 202 means everything works (and we just kicked off a scrape, which is
// fine). 401 means the local secret doesn't match Railway's.
async function probeSecretMatch(): Promise<Probe> {
  if (!scrapeSecret) {
    return warn(`No local SCRAPE_SECRET — can't verify it matches Railway. Set it to enable this check.`);
  }
  if (state.scrapeSecretConfigured === false) {
    return warn(`Skipping secret-match probe (server doesn't have SCRAPE_SECRET set yet).`);
  }
  try {
    const res = await fetch(`${siteUrl}/api/scrape`, {
      method: "POST",
      headers: { "x-scrape-secret": scrapeSecret },
    });
    if (res.status === 401) {
      return fail(`The SCRAPE_SECRET in your shell does not match Railway's. Re-set both to the same value.`);
    }
    if (res.status === 202) {
      const body = await res.json();
      return pass(`SCRAPE_SECRET verified · scrape just started (${body.startedAt}). Will run in the background.`);
    }
    if (res.status === 409) {
      return pass(`SCRAPE_SECRET verified · another scrape was already running (409 with runningSince).`);
    }
    return warn(`SCRAPE_SECRET probe returned unexpected status ${res.status}`);
  } catch (err: any) {
    return fail(`Secret-match probe failed: ${err.message}`);
  }
}

// ── Probe 5: Do we actually have nationwide events? ────────────────
// We can't query the DB directly, but we can ask the homepage's filter
// for events near a non-Philly metro and count what comes back. Bare
// /api/health gives us the global count; this is per-metro confirmation
// for the user's specific complaint ("11222 returns nothing").
async function probeNyc(): Promise<Probe> {
  try {
    // 11222 = Greenpoint, Brooklyn (40.7282, -73.9476).
    const url = `${siteUrl}/?lat=40.7282&lng=-73.9476&radius=5`;
    const res = await fetch(url);
    if (!res.ok) {
      return warn(`Couldn't probe NYC homepage: HTTP ${res.status}`);
    }
    const html = await res.text();
    // Heuristic: count occurrences of /event/ links. The Reveal wrapper
    // hides them in CSS but they exist in the HTML.
    const matches = html.match(/\/event\/[A-Za-z0-9_-]+/g) ?? [];
    const unique = new Set(matches);
    if (unique.size === 0) {
      return fail(`NYC (5mi of 11222) returned 0 events.`);
    }
    return pass(`NYC (5mi of 11222) returns ${unique.size} unique events ✓`);
  } catch (err: any) {
    return warn(`NYC probe failed: ${err.message}`);
  }
}

(async () => {
  const probes: { name: string; result: Probe }[] = [];
  probes.push({ name: "Binary deployed", result: await probeHealthEndpoint() });
  probes.push({ name: "Scrape endpoint", result: await probeScrapeEndpoint() });
  probes.push({ name: "Scrape running", result: await probeScrapeRunning() });
  probes.push({ name: "Secret match", result: await probeSecretMatch() });
  probes.push({ name: "NYC has events", result: await probeNyc() });

  console.log("Probes:");
  for (const p of probes) {
    console.log(`  ${p.result.detail}`);
  }
  console.log("");

  // Decide the single most actionable next step.
  const recommendation = decide(state, probes);
  console.log(`📍 Next step: ${recommendation.title}`);
  console.log(`   ${recommendation.detail}`);
  if (recommendation.command) {
    console.log(`\n   $ ${recommendation.command}`);
  }
  console.log("");

  process.exit(recommendation.exitCode);
})();

// ── Decision tree ──────────────────────────────────────────────────
// One recommendation, by priority. Each branch maps a known state to a
// concrete next action and the exact command to run.
function decide(s: State, probes: { name: string; result: Probe }[]): {
  title: string;
  detail: string;
  command?: string;
  exitCode: number;
} {
  if (s.unreachable) {
    return {
      title: "Site is unreachable",
      detail: `Couldn't connect to ${siteUrl}. Check that the service is up (Railway dashboard), DNS resolves, and you've set SITE_URL correctly. (Default is https://playirl.gg.)`,
      command: `curl -v ${siteUrl}/api/health 2>&1 | head -20`,
      exitCode: 2,
    };
  }
  if (!s.binaryHasHealth) {
    return {
      title: "Deploy this branch",
      detail: "/api/health is missing on prod (the new binary hasn't been deployed yet). Merge this branch to main and let Railway redeploy. Cold deploy ~2 minutes.",
      command: "git push origin HEAD:main",
      exitCode: 1,
    };
  }

  if (!s.scrapeEndpointExists) {
    return {
      title: "Old binary detected",
      detail: "/api/health exists but /api/scrape doesn't respond as expected. Maybe a stale cache or partial deploy — re-deploy.",
      exitCode: 1,
    };
  }

  if (s.scrapeSecretConfigured === false) {
    return {
      title: "Set SCRAPE_SECRET on Railway",
      detail: "/api/scrape returns 'SCRAPE_SECRET not configured'. Generate a secret and add it as a Railway env var, then redeploy. Save the same value locally so the trigger script can use it.",
      command: "openssl rand -hex 32   # then add to Railway Variables, then export locally",
      exitCode: 1,
    };
  }

  if (s.scrapeRunning) {
    const elapsedMin = (Date.now() - new Date(s.scrapeRunning.since).getTime()) / 60_000;
    return {
      title: "Wait — a scrape is in flight",
      detail: `A ${s.scrapeRunning.source} scrape started ${elapsedMin.toFixed(1)} minutes ago. Cold runs take 10–15 min. Re-run this diagnostic in 5 minutes.`,
      exitCode: 0,
    };
  }

  // Did the secret-match probe surface a problem?
  const secretProbe = probes.find((p) => p.name === "Secret match")?.result;
  if (secretProbe && !secretProbe.ok && secretProbe.detail.includes("does not match")) {
    return {
      title: "SCRAPE_SECRET mismatch",
      detail: "The secret in your shell doesn't match what Railway has set. Verify both ends use the same value.",
      command: "echo $SCRAPE_SECRET    # compare to the value in Railway → Variables",
      exitCode: 1,
    };
  }

  if (!s.isNationwide) {
    if (!scrapeSecret) {
      return {
        title: "Trigger the first nationwide scrape",
        detail: `Production has only ${s.eventCount} events (Philly seed). Run the trigger script with your SCRAPE_SECRET to fill it. Cold run: 10–15 min.`,
        command: "export SCRAPE_SECRET=<your secret> && npm run scrape:trigger",
        exitCode: 1,
      };
    }
    return {
      title: "Trigger the first nationwide scrape",
      detail: `Production has only ${s.eventCount} events. Your SCRAPE_SECRET is exported and verified. Run the trigger now.`,
      command: "npm run scrape:trigger",
      exitCode: 1,
    };
  }

  if (s.lastScrape) {
    const ageMin = (Date.now() - new Date(s.lastScrape).getTime()) / 60_000;
    if (ageMin > 60 * 24 * 2) {
      return {
        title: "Scrape is stale",
        detail: `Nationwide data exists (${s.eventCount} events), but the last scrape was ${(ageMin / 60 / 24).toFixed(1)} days ago. Either Railway Cron isn't wired or it's failing silently.`,
        command: "npm run scrape:trigger   # to refresh now; then audit Railway Cron logs",
        exitCode: 1,
      };
    }
  }

  // All probes passed.
  return {
    title: "Looks healthy",
    detail: `Production has ${s.eventCount} events nationwide, last scrape ${s.lastScrape}. NYC and other metros should return events.`,
    exitCode: 0,
  };
}
