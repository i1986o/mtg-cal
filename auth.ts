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
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      const db = getDb();
      // Bootstrap-admin promotion runs here so the UPDATE has a row to hit.
      if (adminEmails.includes(user.email.toLowerCase())) {
        db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now'), last_login_at = datetime('now') WHERE id = ?").run(user.id);
      } else {
        db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
      }
    },
  },
  trustHost: true,
});
