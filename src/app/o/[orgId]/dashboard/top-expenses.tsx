function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Expense = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  categoryName: string;
  submittedByName: string;
};

export function TopExpensesList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No expenses this period.</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              {e.note || e.categoryName}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {e.date.slice(0, 10)} · {e.categoryName} · {e.submittedByName}
            </p>
          </div>
          <p className="shrink-0 font-mono text-sm tabular text-foreground">
            ${money(e.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
