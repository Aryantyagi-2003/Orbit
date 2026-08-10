import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations/auth";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email-not-verified";
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // httpOnly/secure/sameSite come from Auth.js's defaults (httpOnly always,
  // secure automatically in production over HTTPS, sameSite=lax); set
  // explicitly here so the choice is asserted, not assumed.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Auth.js core already lowercases profile.email before it reaches the
      // adapter, but it doesn't trim — normalize explicitly here so the
      // guarantee ("every stored email is trim+lowercase") holds for this
      // provider on its own, not just as a side effect of core internals.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email.trim().toLowerCase(),
          image: profile.picture,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = signInSchema.safeParse(rawCredentials);
        if (!parsed.success) throw new InvalidCredentialsError();

        // parsed.data.email is already trim+lowercase via emailSchema, but
        // normalized again at the actual query — same reasoning as the
        // signup write path: this stays correct even if the schema changes
        // upstream of this call someday.
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.trim().toLowerCase() },
        });
        if (!user?.passwordHash) throw new InvalidCredentialsError();

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) throw new InvalidCredentialsError();

        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
