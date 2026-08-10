import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("DemoPassword9!", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.orbit.app" },
    update: {},
    create: {
      email: "owner@demo.orbit.app",
      name: "Priya Owner",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.orbit.app" },
    update: {},
    create: {
      email: "admin@demo.orbit.app",
      name: "Sam Admin",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  const member = await prisma.user.upsert({
    where: { email: "member@demo.orbit.app" },
    update: {},
    create: {
      email: "member@demo.orbit.app",
      name: "Jordan Member",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo-co" },
    update: {},
    create: { name: "Demo Co.", slug: "demo-co" },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: owner.id, orgId: org.id } },
    update: {},
    create: { userId: owner.id, orgId: org.id, role: "OWNER" },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: admin.id, orgId: org.id } },
    update: {},
    create: { userId: admin.id, orgId: org.id, role: "ADMIN" },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: member.id, orgId: org.id } },
    update: {},
    create: { userId: member.id, orgId: org.id, role: "MEMBER" },
  });

  const categoryDefs = [
    { name: "Travel", color: "chart-1" },
    { name: "Software", color: "chart-2" },
    { name: "Meals", color: "chart-3" },
    { name: "Office", color: "chart-4" },
    { name: "Marketing", color: "chart-5" },
    { name: "Other", color: "chart-6" },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const created = await prisma.category.upsert({
      where: { orgId_name: { orgId: org.id, name: c.name } },
      update: {},
      create: { orgId: org.id, name: c.name, color: c.color },
    });
    categories[c.name] = created.id;
  }

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const expenseSeeds = [
    {
      category: "Travel",
      amount: "842.15",
      day: 4,
      note: "Client site visit — SFO",
      by: admin.id,
    },
    {
      category: "Software",
      amount: "129.00",
      day: 5,
      note: "Design tooling renewal",
      by: owner.id,
    },
    {
      category: "Meals",
      amount: "214.60",
      day: 6,
      note: "Team offsite lunch",
      by: member.id,
    },
    {
      category: "Office",
      amount: "361.20",
      day: 6,
      note: "Monitor arms, x4",
      by: admin.id,
    },
    {
      category: "Travel",
      amount: "58.40",
      day: 7,
      note: "Airport transit",
      by: member.id,
    },
    {
      category: "Marketing",
      amount: "500.00",
      day: 9,
      note: "LinkedIn ad campaign",
      by: owner.id,
    },
    {
      category: "Software",
      amount: "89.00",
      day: 12,
      note: "Analytics add-on",
      by: admin.id,
    },
    {
      category: "Meals",
      amount: "76.30",
      day: 14,
      note: "Client dinner",
      by: owner.id,
    },
    {
      category: "Office",
      amount: "142.75",
      day: 16,
      note: "Standing desk mat",
      by: member.id,
    },
    {
      category: "Other",
      amount: "45.00",
      day: 18,
      note: "Notary fee",
      by: admin.id,
    },
  ];

  for (const e of expenseSeeds) {
    await prisma.expense.create({
      data: {
        orgId: org.id,
        categoryId: categories[e.category],
        amount: new Prisma.Decimal(e.amount),
        date: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), e.day),
        ),
        note: e.note,
        submittedById: e.by,
      },
    });
  }

  const budgetSeeds = [
    { category: "Travel", amount: "1200.00" },
    { category: "Software", amount: "250.00" },
    { category: "Meals", amount: "300.00" },
    { category: "Office", amount: "500.00" },
    { category: "Marketing", amount: "600.00" },
  ];
  for (const b of budgetSeeds) {
    const periodEnd = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
    );
    await prisma.budget.upsert({
      where: {
        orgId_categoryId_periodStart: {
          orgId: org.id,
          categoryId: categories[b.category],
          periodStart: monthStart,
        },
      },
      update: {},
      create: {
        orgId: org.id,
        categoryId: categories[b.category],
        amount: new Prisma.Decimal(b.amount),
        periodStart: monthStart,
        periodEnd,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorId: owner.id,
      action: "ORG_CREATED",
      targetType: "organization",
      targetId: org.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorId: owner.id,
      action: "MEMBER_INVITED",
      targetType: "invite",
      metadata: { email: admin.email, role: "ADMIN" },
    },
  });
  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorId: owner.id,
      action: "MEMBER_INVITED",
      targetType: "invite",
      metadata: { email: member.email, role: "MEMBER" },
    },
  });

  console.log("Seeded demo org:", org.slug);
  console.log("  Owner:  owner@demo.orbit.app  / DemoPassword9!");
  console.log("  Admin:  admin@demo.orbit.app  / DemoPassword9!");
  console.log("  Member: member@demo.orbit.app / DemoPassword9!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
