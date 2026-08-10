"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/session";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/lib/data/expenses";
import {
  ForbiddenError,
  NotAMemberError,
  NotFoundError,
} from "@/lib/data/orgs";
import { expenseSchema } from "@/lib/validations/expense";

export type ExpenseFormState = {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

function mapError(error: unknown): ExpenseFormState {
  if (error instanceof ForbiddenError) {
    return {
      status: "error",
      message: "You don't have permission to do that.",
    };
  }
  if (error instanceof NotAMemberError) {
    return {
      status: "error",
      message: "You're not a member of this organization.",
    };
  }
  if (error instanceof NotFoundError) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: "Something went wrong. Try again." };
}

export async function createExpenseAction(
  orgId: string,
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await requireUser();

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    // orgId here is a route param, not a hidden form field — but even if a
    // caller forged this value in a raw action call, createExpense
    // re-derives the actor's membership/role from the DB independently and
    // throws if they aren't actually a member of *that* org.
    await createExpense(user.id, orgId, parsed.data);
  } catch (error) {
    return mapError(error);
  }

  revalidatePath(`/o/${orgId}/expenses`);
  revalidatePath(`/o/${orgId}/dashboard`);
  return { status: "success" };
}

export async function updateExpenseAction(
  orgId: string,
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await requireUser();

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateExpense(user.id, orgId, expenseId, parsed.data);
  } catch (error) {
    return mapError(error);
  }

  revalidatePath(`/o/${orgId}/expenses`);
  revalidatePath(`/o/${orgId}/dashboard`);
  return { status: "success" };
}

export async function deleteExpenseAction(orgId: string, expenseId: string) {
  const user = await requireUser();
  await deleteExpense(user.id, orgId, expenseId);
  revalidatePath(`/o/${orgId}/expenses`);
  revalidatePath(`/o/${orgId}/dashboard`);
}
