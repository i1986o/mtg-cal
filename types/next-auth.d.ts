import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "organizer" | "user";
      suspended: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "organizer" | "user";
    suspended?: boolean;
  }
}
