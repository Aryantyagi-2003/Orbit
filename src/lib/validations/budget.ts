import { z } from "zod";

import { moneyAmountSchema } from "@/lib/validations/expense";

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: moneyAmountSchema,
  // "2026-08" — first day of that month is periodStart, next month is periodEnd.
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Choose a month"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
