import NextAuth from "next-auth";
import type { Provider } from "@auth/core/providers";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { SqliteAdapter } from "@/lib/auth-adapter";
import { getDb } from "@/lib/db";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const providers: Provider[] = [];
if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
  providers.push(Discord({
    clientId: process.env.AUTH_DISCORD_ID,
    clientSecret: process.env.AUTH_DISCORD_SECRET,
    // `guilds` lets us list which servers the signed-in user is in (so the
    // /account/discord "Add subscription" form can show a dropdown of their
    // servers). Existing users keep the basic scope until they re-auth.
    authorization: { params: { scope: "identify email guilds" } },
    // Auto-link Discord OAuth identities to existing users by verified email.
    // Discord verifies emails before exposing them via the API, so we trust
    // matches as the same human; without this, anyone whose user record was
    // first created via Google or magic-link gets OAuthAccountNotLinked when
    // they try to sign in with Discord later.
    allowDangerousEmailAccountLinking: true,
  }));
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    // Google's OIDC discovery doc claims `authorization_response_iss_parameter_supported: true`,
    // but Google does NOT actually include `iss` in the redirect — oauth4webapi then throws
    // "response parameter iss (issuer) missing". Disable the strict iss check via the v5 escape
    // hatch (https://github.com/nextauthjs/next-auth/issues/8615).
    authorization: {
      params: { scope: "openid email profile" },
    },
    checks: ["pkce"],
    // Same reasoning as the Discord provider — Google verifies emails, so a
    // user who first signed in via magic-link or Discord and now uses Google
    // gets linked to the same record instead of an OAuthAccountNotLinked error.
    allowDangerousEmailAccountLinking: true,
  }));
}
if (process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM) {
  providers.push(Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SqliteAdapter(),
  session: { strategy: "database" },
  providers,
  pages: { signIn: "/admin/login" },
  callbacks: {
    async signIn({ user }) {
      // Reject suspended users. Admin promotion runs in events.signIn (which fires
      // AFTER createUser, so the UPDATE actually hits a row on first login).
      if (!user.email) return false;
      const row = getDb().prepare("SELECT suspended FROM users WHERE email = ?").get(user.email) as { suspended: number } | undefined;
      if (row?.suspended === 1) return false;
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        const row = getDb().prepare("SELECT role, suspended FROM users WHERE id = ?").get(user.id) as { role: string; suspended: number } | undefined;
        session.user.id = user.id;
        session.user.role = (row?.role ?? "user") as "admin" | "organizer" | "user";
        session.user.suspended = row?.suspended === 1;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.id || !user.email) return;
      const db = getDb();
      // Bootstrap-admin promotion runs here so the UPDATE has a row to hit.
      if (adminEmails.includes(user.email.toLowerCase())) {
        db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now'), last_login_at = datetime('now') WHERE id = ?").run(user.id);
      } else {
        db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
      }
      // Refresh the stored OAuth token + scope on every sign-in. Auth.js's
      // adapter calls `linkAccount` only once per provider/account_id pair,
      // so without this hook a user who signed in last month with an older
      // scope set keeps a stale access_token forever and re-auth feels like
      // a no-op. Specifically: this is what lets the Discord bot manager
      // see the user's guilds the first time we add a new scope.
      if (account && (account.access_token || account.refresh_token)) {
        db.prepare(
          `UPDATE accounts SET access_token = ?, refresh_token = ?, scope = ?, expires_at = ?, token_type = ?, id_token = ?
             WHERE provider = ? AND provider_account_id = ?`,
        ).run(
          account.access_token ?? null,
          account.refresh_token ?? null,
          account.scope ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.id_token ?? null,
          account.provider,
          account.providerAccountId,
        );
      }
    },
  },
  trustHost: true,
});
