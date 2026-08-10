import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { can, canMutateExpense } from "@/lib/permissions";
import {
  requireMembership,
  ForbiddenError,
  NotFoundError,
} from "@/lib/data/orgs";
import { recordAuditLog } from "@/lib/data/audit";
import type { ExpenseFilters, ExpenseInput } from "@/lib/validations/expense";

export async function listExpenses(
  userId: string,
  orgId: string,
  filters: ExpenseFilters = {},
) {
  await requireMembership(userId, orgId);

  const where: Prisma.ExpenseWhereInput = {
    orgId,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  return prisma.expense.findMany({
    where,
    include: {
      category: true,
      submittedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function createExpense(
  userId: string,
  orgId: string,
  input: ExpenseInput,
) {
  const { role } = await requireMembership(userId, orgId);
  if (!can(role, "expense:create")) throw new ForbiddenError();

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, orgId },
  });
  if (!category) throw new NotFoundError("Category not found.");

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        orgId,
        categoryId: input.categoryId,
        amount: new Prisma.Decimal(input.amount),
        date: new Date(input.date),
        note: input.note || null,
        submittedById: userId,
      },
    });

    await recordAuditLog(
      {
        orgId,
        actorId: userId,
        action: "EXPENSE_CREATED",
        targetType: "expense",
        targetId: expense.id,
        metadata: { amount: input.amount, categoryId: input.categoryId },
      },
      tx,
    );

    return expense;
  });
}

export async function updateExpense(
  userId: string,
  orgId: string,
  expenseId: string,
  input: ExpenseInput,
) {
  const { role } = await requireMembership(userId, orgId);

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, orgId },
  });
  if (!expense) throw new NotFoundError("Expense not found.");

  if (!canMutateExpense(role, userId, expense.submittedById)) {
    throw new ForbiddenError();
  }

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, orgId },
  });
  if (!category) throw new NotFoundError("Category not found.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: input.categoryId,
        amount: new Prisma.Decimal(input.amount),
        date: new Date(input.date),
        note: input.note || null,
      },
    });

    await recordAuditLog(
      {
        orgId,
        actorId: userId,
        action: "EXPENSE_UPDATED",
        targetType: "expense",
        targetId: expenseId,
        metadata: { amount: input.amount, categoryId: input.categoryId },
      },
      tx,
    );

    return updated;
  });
}

export async function deleteExpense(
  userId: string,
  orgId: string,
  expenseId: string,
) {
  const { role } = await requireMembership(userId, orgId);

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, orgId },
  });
  if (!expense) throw new NotFoundError("Expense not found.");

  if (!canMutateExpense(role, userId, expense.submittedById)) {
    throw new ForbiddenError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: expenseId } });
    await recordAuditLog(
      {
        orgId,
        actorId: userId,
        action: "EXPENSE_DELETED",
        targetType: "expense",
        targetId: expenseId,
        metadata: {
          amount: expense.amount.toString(),
          categoryId: expense.categoryId,
        },
      },
      tx,
    );
  });
}

function dateWhere(from: Date, to: Date, categoryId?: string): Prisma.ExpenseWhereInput {
  return {
    date: { gte: from, lte: to },
    ...(categoryId ? { categoryId } : {}),
  };
}

export async function getSpendByCategory(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  categoryId?: string,
) {
  await requireMembership(userId, orgId);

  const rows = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { orgId, ...dateWhere(from, to, categoryId) },
    _sum: { amount: true },
  });

  const categories = await prisma.category.findMany({ where: { orgId } });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return rows
    .map((row) => ({
      category: categoryById.get(row.categoryId),
      total: Number(row._sum.amount ?? 0),
    }))
    .filter((r) => r.category)
    .sort((a, b) => b.total - a.total) as {
    category: NonNullable<ReturnType<typeof categoryById.get>>;
    total: number;
  }[];
}

export async function getSpendOverTime(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  categoryId?: string,
) {
  await requireMembership(userId, orgId);

  const expenses = await prisma.expense.findMany({
    where: { orgId, ...dateWhere(from, to, categoryId) },
    select: { date: true, amount: true },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, number>();
  for (const e of expenses) {
    const key = e.date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(e.amount));
  }

  return Array.from(byDay.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type ExpenseStats = {
  total: number;
  count: number;
  average: number;
  largest: {
    id: string;
    amount: number;
    categoryName: string;
    date: string;
    note: string | null;
  } | null;
};

export async function getExpenseStats(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Promise<ExpenseStats> {
  await requireMembership(userId, orgId);

  const where = { orgId, ...dateWhere(from, to, categoryId) };

  const [agg, largest] = await Promise.all([
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    }),
    prisma.expense.findFirst({
      where,
      orderBy: { amount: "desc" },
      include: { category: { select: { name: true } } },
    }),
  ]);

  return {
    total: Number(agg._sum.amount ?? 0),
    count: agg._count,
    average: Number(agg._avg.amount ?? 0),
    largest: largest
      ? {
          id: largest.id,
          amount: Number(largest.amount),
          categoryName: largest.category.name,
          date: largest.date.toISOString(),
          note: largest.note,
        }
      : null,
  };
}

/** The caller's own totals for the period — the Member dashboard's headline numbers, never a peer's. */
export async function getMyExpenseStats(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
): Promise<{ total: number; count: number }> {
  await requireMembership(userId, orgId);

  const agg = await prisma.expense.aggregate({
    where: { orgId, submittedById: userId, date: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: true,
  });

  return { total: Number(agg._sum.amount ?? 0), count: agg._count };
}

/** Total spend for a bare comparison window — used for month-over-month deltas. */
export async function getSpendTotal(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  categoryId?: string,
): Promise<number> {
  await requireMembership(userId, orgId);
  const agg = await prisma.expense.aggregate({
    where: { orgId, ...dateWhere(from, to, categoryId) },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

export async function getSpendByMember(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  categoryId?: string,
) {
  await requireMembership(userId, orgId);

  const rows = await prisma.expense.groupBy({
    by: ["submittedById"],
    where: { orgId, ...dateWhere(from, to, categoryId) },
    _sum: { amount: true },
    _count: true,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.submittedById) } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const user = userById.get(row.submittedById);
      return {
        userId: row.submittedById,
        name: user?.name ?? user?.email ?? "Unknown",
        total: Number(row._sum.amount ?? 0),
        count: row._count,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Monthly totals for the trailing N months (inclusive of the current month) — independent of the period filter, since a trend needs its own fixed window. */
export async function getMonthlySpendTrend(
  userId: string,
  orgId: string,
  months: number,
  categoryId?: string,
) {
  await requireMembership(userId, orgId);

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const expenses = await prisma.expense.findMany({
    where: { orgId, date: { gte: from }, ...(categoryId ? { categoryId } : {}) },
    select: { date: true, amount: true },
  });

  const byMonth = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    byMonth.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const e of expenses) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + Number(e.amount));
  }

  return Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }));
}

export async function getTopExpenses(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
  limit: number,
  categoryId?: string,
) {
  await requireMembership(userId, orgId);

  return prisma.expense.findMany({
    where: { orgId, ...dateWhere(from, to, categoryId) },
    orderBy: { amount: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      submittedBy: { select: { name: true, email: true } },
    },
  });
}

/** Most recent expenses org-wide, not bound by the period filter — an activity feed reads "what just happened," not "what happened in this window." */
export async function getRecentExpenses(userId: string, orgId: string, limit: number) {
  await requireMembership(userId, orgId);

  return prisma.expense.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      submittedBy: { select: { name: true, email: true } },
    },
  });
}

/** A Member's own recent expenses, queried directly — not filtered out of
 * the org-wide recent list, which could cut off their older items if
 * enough other people's expenses came in more recently. */
export async function getMyRecentExpenses(userId: string, orgId: string, limit: number) {
  await requireMembership(userId, orgId);

  return prisma.expense.findMany({
    where: { orgId, submittedById: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      submittedBy: { select: { name: true, email: true } },
    },
  });
}
