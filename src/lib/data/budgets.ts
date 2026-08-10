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

export type CategoryBreakdownRow = {
  categoryId: string;
  categoryName: string;
  budgeted: number | null;
  actual: number;
  remaining: number | null;
  percentUsed: number | null;
};

/**
 * Every category for the org, budgeted or not, with actual spend for the
 * given period — the dense "Category | Budgeted | Actual | Remaining | %"
 * table. Categories with no budget set still show their actual spend
 * (budgeted/remaining/percentUsed come back null, not zero — zero would
 * misleadingly read as "a $0 budget", not "no budget was set").
 */
export async function getCategoryBreakdown(
  userId: string,
  orgId: string,
  period: string,
  categoryId?: string,
): Promise<CategoryBreakdownRow[]> {
  await requireMembership(userId, orgId);

  const { periodStart, periodEnd } = periodToRange(period);

  const [categories, budgets, actuals] = await Promise.all([
    prisma.category.findMany({
      where: { orgId, ...(categoryId ? { id: categoryId } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({ where: { orgId, periodStart } }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { orgId, date: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
  ]);

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));
  const actualByCategory = new Map(
    actuals.map((a) => [a.categoryId, Number(a._sum.amount ?? 0)]),
  );

  return categories.map((c) => {
    const budget = budgetByCategory.get(c.id);
    const actual = actualByCategory.get(c.id) ?? 0;
    const budgeted = budget ? Number(budget.amount) : null;
    return {
      categoryId: c.id,
      categoryName: c.name,
      budgeted,
      actual,
      remaining: budgeted !== null ? budgeted - actual : null,
      percentUsed:
        budgeted !== null && budgeted > 0
          ? Math.round((actual / budgeted) * 100)
          : null,
    };
  });
}

export async function countCategoriesOverBudget(
  userId: string,
  orgId: string,
  period: string,
): Promise<number> {
  const rows = await getCategoryBreakdown(userId, orgId, period);
  return rows.filter((r) => r.percentUsed !== null && r.percentUsed >= 100)
    .length;
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
