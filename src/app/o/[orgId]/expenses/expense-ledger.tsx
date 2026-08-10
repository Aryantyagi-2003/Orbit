"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canMutateExpense } from "@/lib/permissions";

import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
  type ExpenseFormState,
} from "./actions";

// Defined here, not in actions.ts — a "use server" module can only export
// async functions, so this plain object has to live on the client side.
const initialExpenseFormState: ExpenseFormState = { status: "idle" };

type Expense = {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  note: string | null;
  submittedById: string;
  submittedByName: string;
};

type Category = { id: string; name: string };

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function ExpenseForm({
  action,
  categories,
  defaultValues,
  onSuccess,
}: {
  action: (
    state: ExpenseFormState,
    formData: FormData,
  ) => Promise<ExpenseFormState>;
  categories: Category[];
  defaultValues?: {
    categoryId: string;
    amount: string;
    date: string;
    note: string | null;
  };
  onSuccess: () => void;
}) {
  const [state, formAction] = useFormState(action, initialExpenseFormState);

  if (state.status === "success") {
    onSuccess();
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select
          name="categoryId"
          defaultValue={defaultValues?.categoryId}
          required
        >
          <SelectTrigger className="mt-1.5" id="categoryId">
            {/* Radix's SelectValue only auto-fills from the matching
                SelectItem's rendered text once the popover has opened at
                least once (that's where item text registers) — pass the
                label explicitly so an edit form pre-filled with a
                defaultValue doesn't render blank on first paint. */}
            <SelectValue placeholder="Choose a category">
              {categories.find((c) => c.id === defaultValues?.categoryId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.categoryId && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {state.fieldErrors.categoryId[0]}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaultValues?.amount}
            className="mt-1.5 font-mono tabular"
            required
          />
          {state.fieldErrors?.amount && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {state.fieldErrors.amount[0]}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={defaultValues?.date}
            className="mt-1.5 font-mono"
            required
          />
          {state.fieldErrors?.date && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {state.fieldErrors.date[0]}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          name="note"
          defaultValue={defaultValues?.note ?? ""}
          className="mt-1.5"
          rows={2}
        />
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
        <SubmitButton label={defaultValues ? "Save changes" : "Add expense"} />
      </DialogFooter>
    </form>
  );
}

export function ExpenseLedger({
  orgId,
  expenses,
  categories,
  currentUserId,
  currentUserRole,
}: {
  orgId: string;
  expenses: Expense[];
  categories: Category[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const boundCreate = async (_state: ExpenseFormState, formData: FormData) =>
    createExpenseAction(orgId, _state, formData);

  const boundUpdate = async (_state: ExpenseFormState, formData: FormData) =>
    editing ? updateExpenseAction(orgId, editing.id, _state, formData) : _state;

  // Ascending running total, then displayed in reverse so the ledger reads
  // newest-first while the running-total column still accumulates forward
  // in time (the way a real ledger book would).
  const withRunningTotal = useMemo(() => {
    const chronological = [...expenses].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let running = 0;
    const totals = new Map<string, number>();
    for (const e of chronological) {
      running += Number(e.amount);
      totals.set(e.id, running);
    }
    return expenses.map((e) => ({ ...e, runningTotal: totals.get(e.id) ?? 0 }));
  }, [expenses]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button onClick={() => setAddOpen(true)}>Add expense</Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add expense</DialogTitle>
              <DialogDescription>
                Recorded under your name and today&apos;s org.
              </DialogDescription>
            </DialogHeader>
            <ExpenseForm
              action={boundCreate}
              categories={categories}
              onSuccess={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Running total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {withRunningTotal.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No expenses yet — add the first one above.
                </TableCell>
              </TableRow>
            )}
            {withRunningTotal.map((e) => {
              const canMutate = canMutateExpense(
                currentUserRole,
                currentUserId,
                e.submittedById,
              );
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.date.slice(0, 10)}
                  </TableCell>
                  <TableCell>{e.categoryName}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {e.note || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.submittedByName}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular">
                    ${money(Number(e.amount))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular text-muted-foreground">
                    ${money(e.runningTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canMutate && (
                      <div className="flex justify-end gap-2">
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(e)}
                        >
                          Edit
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger className="text-xs text-destructive hover:underline">
                            Delete
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this expense?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ${money(Number(e.amount))} — {e.categoryName},{" "}
                                {e.date.slice(0, 10)}. This can&apos;t be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteExpenseAction(orgId, e.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              action={boundUpdate}
              categories={categories}
              defaultValues={{
                categoryId: editing.categoryId,
                amount: editing.amount,
                date: editing.date.slice(0, 10),
                note: editing.note,
              }}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
