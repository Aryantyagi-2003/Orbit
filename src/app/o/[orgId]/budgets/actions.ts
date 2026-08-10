"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/session";
import { createBudget, deleteBudget } from "@/lib/data/budgets";
import {
  ForbiddenError,
  NotAMemberError,
  NotFoundError,
} from "@/lib/data/orgs";
import { budgetSchema } from "@/lib/validations/budget";

export type BudgetFormState = {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

function mapError(error: unknown): BudgetFormState {
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

export async function createBudgetAction(
  orgId: string,
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const user = await requireUser();

  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    period: formData.get("period"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createBudget(user.id, orgId, parsed.data);
  } catch (error) {
    return mapError(error);
  }

  revalidatePath(`/o/${orgId}/budgets`);
  revalidatePath(`/o/${orgId}/dashboard`);
  return { status: "success" };
}

export async function deleteBudgetAction(orgId: string, budgetId: string) {
  const user = await requireUser();
  await deleteBudget(user.id, orgId, budgetId);
  revalidatePath(`/o/${orgId}/budgets`);
  revalidatePath(`/o/${orgId}/dashboard`);
}
