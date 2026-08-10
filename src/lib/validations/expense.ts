import { z } from "zod";

// Decimal(12,2) in Postgres — validated as a plain string here (form input),
// parsed to a number only at the two-decimal-place boundary Prisma expects.
export const moneyAmountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 42.50")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: moneyAmountSchema,
  date: z.string().trim().min(1, "Date is required"),
  note: z
    .string()
    .trim()
    .max(280, "Note must be at most 280 characters")
    .optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const expenseFiltersSchema = z.object({
  categoryId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
