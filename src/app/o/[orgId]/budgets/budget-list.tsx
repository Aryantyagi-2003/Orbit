"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, CircleCheck, CircleX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import {
  createBudgetAction,
  deleteBudgetAction,
  type BudgetFormState,
} from "./actions";

const initialBudgetFormState: BudgetFormState = { status: "idle" };

type Budget = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  actual: number;
};
type Category = { id: string; name: string };

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusFor(pct: number) {
  if (pct >= 100)
    return {
      variant: "critical" as const,
      Icon: CircleX,
      label: "Over budget",
    };
  if (pct >= 80)
    return {
      variant: "warning" as const,
      Icon: AlertTriangle,
      label: "Near limit",
    };
  return { variant: "good" as const, Icon: CircleCheck, label: "On track" };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Set budget"}
    </Button>
  );
}

export function BudgetList({
  orgId,
  period,
  budgets,
  categories,
  canManage,
}: {
  orgId: string;
  period: string;
  budgets: Budget[];
  categories: Category[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boundCreate = async (state: BudgetFormState, formData: FormData) =>
    createBudgetAction(orgId, state, formData);
  const [state, formAction] = useFormState(boundCreate, initialBudgetFormState);

  if (state.status === "success" && open) setOpen(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>Set budget</Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set budget for {period}</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="period" value={period} />
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select name="categoryId" required>
                    <SelectTrigger className="mt-1.5" id="categoryId">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Monthly budget</Label>
                  <Input
                    id="amount"
                    name="amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-1.5 font-mono tabular"
                    required
                  />
                  {state.fieldErrors?.amount && (
                    <p className="mt-1 text-xs text-destructive" role="alert">
                      {state.fieldErrors.amount[0]}
                    </p>
                  )}
                </div>
                {state.status === "error" && state.message && (
                  <div
                    role="alert"
                    className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {state.message}
                  </div>
                )}
                <DialogFooter>
                  <SubmitButton />
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {budgets.length === 0 && (
        <p className="rounded-sm border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No budgets set for {period} yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {budgets.map((b) => {
          const budgeted = Number(b.amount);
          const pct =
            budgeted > 0 ? Math.round((b.actual / budgeted) * 100) : 0;
          const { variant, Icon, label } = statusFor(pct);
          return (
            <div
              key={b.id}
              className="rounded-sm border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {b.categoryName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular">
                    ${money(b.actual)} of ${money(budgeted)}
                  </p>
                </div>
                <Badge
                  variant={variant}
                  className="inline-flex items-center gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Badge>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    variant === "critical" && "bg-status-critical",
                    variant === "warning" && "bg-status-warning",
                    variant === "good" && "bg-status-good",
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              {canManage && (
                <div className="mt-3 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger className="text-xs text-destructive hover:underline">
                      Remove budget
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this budget?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {b.categoryName} — ${money(budgeted)} for {period}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBudgetAction(orgId, b.id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
