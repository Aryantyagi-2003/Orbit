import { AlertTriangle, CircleCheck, CircleX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryBreakdownRow } from "@/lib/data/budgets";

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusFor(percentUsed: number | null) {
  if (percentUsed === null) return null;
  if (percentUsed >= 100)
    return { variant: "critical" as const, Icon: CircleX, label: "Over" };
  if (percentUsed >= 80)
    return {
      variant: "warning" as const,
      Icon: AlertTriangle,
      label: "Near limit",
    };
  return { variant: "good" as const, Icon: CircleCheck, label: "On track" };
}

export function CategoryBreakdownTable({
  rows,
}: {
  rows: CategoryBreakdownRow[];
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Budgeted</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead className="text-right">% used</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No categories yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => {
            const status = statusFor(r.percentUsed);
            return (
              <TableRow key={r.categoryId}>
                <TableCell className="font-medium text-foreground">
                  {r.categoryName}
                </TableCell>
                <TableCell className="text-right font-mono tabular text-muted-foreground">
                  {r.budgeted !== null ? `$${money(r.budgeted)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular">
                  ${money(r.actual)}
                </TableCell>
                <TableCell
                  className={
                    "text-right font-mono tabular " +
                    (r.remaining !== null && r.remaining < 0
                      ? "text-status-critical"
                      : "text-muted-foreground")
                  }
                >
                  {r.remaining !== null ? `$${money(r.remaining)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular text-muted-foreground">
                  {r.percentUsed !== null ? `${r.percentUsed}%` : "—"}
                </TableCell>
                <TableCell>
                  {status ? (
                    <Badge
                      variant={status.variant}
                      className="inline-flex items-center gap-1"
                    >
                      <status.Icon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No budget
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
