// The most literal version of "a raw call with a tampered org ID must be
// rejected": this bypasses the UI, the browser, and even HTTP entirely,
// and calls the actual /lib/data functions directly — the same functions
// every Server Action calls into — the way a hostile client's forged
// request would eventually land, if it ever got past the network layer.
//
// Run with: tsx --conditions=react-server e2e/tenancy-data-layer-check.mjs
// (the react-server condition is what lets this plain Node script import
// modules that are normally guarded by the `server-only` package)
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/data/expenses";
import { changeMemberRole, removeMember } from "@/lib/data/orgs";

const prisma = new PrismaClient();
let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures++;
  }
}

async function expectRejected(label, fn, errorName) {
  try {
    const r = await fn();
    console.log("    (no error thrown, returned:", r, ")");
    check(label, false);
  } catch (e) {
    // Compared by .name, not `instanceof` — running this file standalone
    // under tsx can resolve "@/lib/data/orgs" to two distinct module
    // instances (one direct, one transitively via expenses.ts), which
    // breaks class identity even though the rejection itself is correct.
    // That's a quirk of this Node harness, not of the real bundled app.
    if (e?.name !== errorName) {
      console.log("    (wrong error type — got", e?.name, e?.message, ")");
    }
    check(label, e?.name === errorName);
  }
}

async function main() {
  const suffix = randomUUID().slice(0, 8);

  const userA = await prisma.user.create({
    data: { email: `tenancy-a-${suffix}@e2e.orbit.test`, name: "Tenancy A" },
  });
  const userB = await prisma.user.create({
    data: { email: `tenancy-b-${suffix}@e2e.orbit.test`, name: "Tenancy B" },
  });

  const orgA = await prisma.organization.create({
    data: { name: `Tenancy Org A ${suffix}`, slug: `tenancy-a-${suffix}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: `Tenancy Org B ${suffix}`, slug: `tenancy-b-${suffix}` },
  });

  await prisma.membership.create({
    data: { userId: userA.id, orgId: orgA.id, role: "OWNER" },
  });
  await prisma.membership.create({
    data: { userId: userB.id, orgId: orgB.id, role: "MEMBER" },
  });

  const categoryA = await prisma.category.create({
    data: { orgId: orgA.id, name: "General", color: "chart-1" },
  });
  const expenseA = await prisma.expense.create({
    data: {
      orgId: orgA.id,
      categoryId: categoryA.id,
      amount: new Prisma.Decimal("777.00"),
      date: new Date(),
      submittedById: userA.id,
    },
  });

  console.log(
    "\nScenario: userB (member of Org B only) calls Org A's data functions directly, orgId forged to Org A's real ID\n",
  );

  await expectRejected(
    "createExpense(userB, orgA.id, ...) rejected",
    () =>
      createExpense(userB.id, orgA.id, {
        categoryId: categoryA.id,
        amount: "12.00",
        date: "2026-01-01",
      }),
    "NotAMemberError",
  );

  await expectRejected(
    "updateExpense(userB, orgA.id, expenseA.id, ...) rejected",
    () =>
      updateExpense(userB.id, orgA.id, expenseA.id, {
        categoryId: categoryA.id,
        amount: "1.00",
        date: "2026-01-01",
      }),
    "NotAMemberError",
  );

  await expectRejected(
    "deleteExpense(userB, orgA.id, expenseA.id) rejected",
    () => deleteExpense(userB.id, orgA.id, expenseA.id),
    "NotAMemberError",
  );

  const membershipA = await prisma.membership.findUniqueOrThrow({
    where: { userId_orgId: { userId: userA.id, orgId: orgA.id } },
  });

  await expectRejected(
    "changeMemberRole(userB, orgA.id, ownerA_membership, MEMBER) rejected",
    () => changeMemberRole(userB.id, orgA.id, membershipA.id, "MEMBER"),
    "NotAMemberError",
  );

  await expectRejected(
    "removeMember(userB, orgA.id, ownerA_membership) rejected",
    () => removeMember(userB.id, orgA.id, membershipA.id),
    "NotAMemberError",
  );

  // Confirm nothing was actually mutated despite the attempts.
  const untouchedExpense = await prisma.expense.findUniqueOrThrow({
    where: { id: expenseA.id },
  });
  // Prisma's Decimal.toString() trims trailing zeros ("777", not "777.00").
  check(
    "Org A's expense amount is untouched ($777.00)",
    untouchedExpense.amount.toString() === "777",
  );

  const untouchedMembership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipA.id },
  });
  check(
    "Org A owner's role is untouched (OWNER)",
    untouchedMembership.role === "OWNER",
  );

  console.log(
    "\nScenario: a real Member of Org A tries changeMemberRole on the Owner (role-boundary, not tenancy)\n",
  );

  const memberOfA = await prisma.user.create({
    data: {
      email: `tenancy-member-${suffix}@e2e.orbit.test`,
      name: "Tenancy Member of A",
    },
  });
  await prisma.membership.create({
    data: { userId: memberOfA.id, orgId: orgA.id, role: "MEMBER" },
  });

  await expectRejected(
    "Member of Org A calling changeMemberRole on the Owner is rejected",
    () => changeMemberRole(memberOfA.id, orgA.id, membershipA.id, "MEMBER"),
    "ForbiddenError",
  );
  await expectRejected(
    "Member of Org A calling removeMember on the Owner is rejected",
    () => removeMember(memberOfA.id, orgA.id, membershipA.id),
    "ForbiddenError",
  );

  console.log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
