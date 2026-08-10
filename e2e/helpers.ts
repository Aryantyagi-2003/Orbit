import { PrismaClient, Prisma, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import Redis from "ioredis";

export const prisma = new PrismaClient();

// Sign-in is rate-limited per IP, not per email, so a spec that trips it
// (or just runs enough real sign-ins back to back) can starve every spec
// that runs after it within the same 60s window. Call this before any test
// that needs a guaranteed-clean sign-in.
export async function resetSignInRateLimit() {
  const redis = new Redis({ port: 6379, host: "127.0.0.1", lazyConnect: true });
  await redis.connect();
  const keys = await redis.keys("ratelimit:auth:signin*");
  if (keys.length) await redis.del(...keys);
  await redis.quit();
}

const TEST_PASSWORD = "TestPassw0rd!";

export async function createVerifiedUser(emailPrefix: string, name: string) {
  const email = `${emailPrefix}-${randomUUID().slice(0, 8)}@e2e.orbit.test`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, emailVerified: new Date() },
  });
  return { ...user, password: TEST_PASSWORD };
}

export async function createOrgWithOwner(
  orgName: string,
  owner: { id: string },
) {
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: `${orgName.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 6)}`,
    },
  });
  await prisma.membership.create({
    data: { userId: owner.id, orgId: org.id, role: "OWNER" },
  });
  const category = await prisma.category.create({
    data: { orgId: org.id, name: "General", color: "chart-1" },
  });
  return { org, category };
}

export async function addMember(orgId: string, userId: string, role: Role) {
  return prisma.membership.create({ data: { orgId, userId, role } });
}

export async function createExpenseFixture(
  orgId: string,
  categoryId: string,
  submittedById: string,
  amount = "50.00",
) {
  return prisma.expense.create({
    data: {
      orgId,
      categoryId,
      amount: new Prisma.Decimal(amount),
      date: new Date(),
      submittedById,
    },
  });
}

export const TEST_PASSWORD_EXPORT = TEST_PASSWORD;
