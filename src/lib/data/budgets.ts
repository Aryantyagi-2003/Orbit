import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import {
  requireMembership,
  ForbiddenError,
  NotFoundError,
} from "@/lib/data/orgs";
import { recordAuditLog } from "@/lib/data/audit";
import type { BudgetInput } from "@/lib/validations/budget";

function periodToRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(
    Date.UTC(month === 12 ? year + 1 : year, month % 12, 1),
  );
  return { periodStart, periodEnd };
}

export async function listBudgets(
  userId: string,
  orgId: string,
  period?: string,
) {
  await requireMembership(userId, orgId);

  const where: Prisma.BudgetWhereInput = { orgId };
  if (period) {
    const { periodStart } = periodToRange(period);
    where.periodStart = periodStart;
  }

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: [{ periodStart: "desc" }, { category: { name: "asc" } }],
  });

  const actuals = await Promise.all(
    budgets.map((b) =>
      prisma.expense.aggregate({
        where: {
          orgId,
          categoryId: b.categoryId,
          date: { gte: b.periodStart, lt: b.periodEnd },
        },
        _sum: { amount: true },
      }),
    ),
  );

  return budgets.map((b, i) => ({
    ...b,
    actual: Number(actuals[i]._sum.amount ?? 0),
  }));
}

export async function createBudget(
  userId: string,
  orgId: string,
  input: BudgetInput,
) {
  const { role } = await requireMembership(userId, orgId);
  if (!can(role, "budget:manage")) throw new ForbiddenError();

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, orgId },
  });
  if (!category) throw new NotFoundError("Category not found.");

  const { periodStart, periodEnd } = periodToRange(input.period);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.budget.findUnique({
      where: {
        orgId_categoryId_periodStart: {
          orgId,
          categoryId: input.categoryId,
          periodStart,
        },
      },
    });

    const budget = await tx.budget.upsert({
      where: {
        orgId_categoryId_periodStart: {
          orgId,
          categoryId: input.categoryId,
          periodStart,
        },
      },
      create: {
        orgId,
        categoryId: input.categoryId,
        amount: new Prisma.Decimal(input.amount),
        periodStart,
        periodEnd,
      },
      update: {
        amount: new Prisma.Decimal(input.amount),
      },
    });

    await recordAuditLog(
      {
        orgId,
        actorId: userId,
        action: existing ? "BUDGET_UPDATED" : "BUDGET_CREATED",
        targetType: "budget",
        targetId: budget.id,
        metadata: {
          amount: input.amount,
          categoryId: input.categoryId,
          period: input.period,
        },
      },
      tx,
    );

    return budget;
  });
}

export async function deleteBudget(
  userId: string,
  orgId: string,
  budgetId: string,
) {
  const { role } = await requireMembership(userId, orgId);
  if (!can(role, "budget:manage")) throw new ForbiddenError();

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, orgId },
  });
  if (!budget) throw new NotFoundError("Budget not found.");

  await prisma.$transaction(async (tx) => {
    await tx.budget.delete({ where: { id: budgetId } });
    await recordAuditLog(
      {
        orgId,
        actorId: userId,
        action: "BUDGET_DELETED",
        targetType: "budget",
        targetId: budgetId,
        metadata: {
          categoryId: budget.categoryId,
          period: budget.periodStart.toISOString().slice(0, 7),
        },
      },
      tx,
    );
  });
}
