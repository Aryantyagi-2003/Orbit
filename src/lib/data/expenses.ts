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

export async function getSpendByCategory(
  userId: string,
  orgId: string,
  from: Date,
  to: Date,
) {
  await requireMembership(userId, orgId);

  const rows = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { orgId, date: { gte: from, lte: to } },
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
) {
  await requireMembership(userId, orgId);

  const expenses = await prisma.expense.findMany({
    where: { orgId, date: { gte: from, lte: to } },
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
