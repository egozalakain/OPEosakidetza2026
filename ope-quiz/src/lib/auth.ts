import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contrasena", type: "password" },
        clientIp: {},
        clientUserAgent: {},
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        const clientIp = (credentials?.clientIp as string) || "unknown";
        const clientUserAgent = (credentials?.clientUserAgent as string) || "unknown";
        const envUser = process.env.AUTH_USER;
        const envPass = process.env.AUTH_PASSWORD;

        const success = username === envUser && password === envPass;

        // Log the attempt to the database
        try {
          await db.insert(auditLogs).values({
            event: success ? "login_success" : "login_failure",
            usernameAttempted: username || "",
            passwordAttempted: success ? "***" : (password || ""),
            ipAddress: clientIp,
            userAgent: clientUserAgent,
            success,
          });
        } catch (e) {
          console.error("[AUDIT] Failed to write audit log:", e);
        }

        if (success) {
          return { id: "1", name: "admin" };
        }
        return null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
});
