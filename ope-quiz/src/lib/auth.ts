import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.AUTH_USER &&
          credentials?.password === process.env.AUTH_PASSWORD
        ) {
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
