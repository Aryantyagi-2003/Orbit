import "server-only";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { SignUpInput } from "@/lib/validations/auth";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export async function createUserWithPassword(input: SignUpInput) {
  // Normalized again here, not just at the Zod boundary (input.email is
  // already lowercased by emailSchema) — this is the actual write path, so
  // it stays correct even if a future caller reaches it with unparsed input.
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new EmailAlreadyRegisteredError();

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
    },
  });

  const token = randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  return { user, token };
}

export async function consumeVerificationToken(token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || record.expires < new Date()) return null;

  await prisma.verificationToken.delete({ where: { token } });

  const user = await prisma.user.update({
    where: { email: record.identifier.trim().toLowerCase() },
    data: { emailVerified: new Date() },
  });

  return user;
}
