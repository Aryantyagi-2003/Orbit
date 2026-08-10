"use client";

import { useState, useTransition } from "react";
import type { AuditAction } from "@prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchAuditLogAction } from "./actions";

type Entry = {
  id: string;
  action: AuditAction;
  actorName: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_LABEL: Record<AuditAction, string> = {
  MEMBER_ROLE_CHANGED: "Role changed",
  MEMBER_REMOVED: "Member removed",
  MEMBER_INVITED: "Member invited",
  INVITE_REVOKED: "Invite revoked",
  BUDGET_CREATED: "Budget created",
  BUDGET_UPDATED: "Budget updated",
  BUDGET_DELETED: "Budget deleted",
  EXPENSE_CREATED: "Expense created",
  EXPENSE_UPDATED: "Expense updated",
  EXPENSE_DELETED: "Expense deleted",
  ORG_SETTINGS_UPDATED: "Org settings updated",
  ORG_CREATED: "Organization created",
};

function summarize(entry: Entry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "MEMBER_ROLE_CHANGED":
      return `${String(m.fromRole)} → ${String(m.toRole)}`;
    case "MEMBER_REMOVED":
      return `role: ${String(m.removedRole)}`;
    case "MEMBER_INVITED":
      return `${String(m.email)} as ${String(m.role)}`;
    case "INVITE_REVOKED":
      return String(m.email ?? "");
    case "EXPENSE_CREATED":
    case "EXPENSE_UPDATED":
    case "EXPENSE_DELETED":
      return m.amount ? `$${String(m.amount)}` : "";
    case "BUDGET_CREATED":
    case "BUDGET_UPDATED":
    case "BUDGET_DELETED":
      return `${m.period ?? ""} — $${String(m.amount ?? "")}`;
    default:
      return "";
  }
}

const PAGE_SIZE = 25;

export function AuditLogPanel({
  orgId,
  initialEntries,
  initialTotal,
}: {
  orgId: string;
  initialEntries: Entry[];
  initialTotal: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  function refetch(nextAction: AuditAction | "ALL", nextPage: number) {
    startTransition(async () => {
      const result = await fetchAuditLogAction(
        orgId,
        { action: nextAction === "ALL" ? undefined : nextAction },
        nextPage,
      );
      setEntries(
        result.entries.map((e) => ({
          id: e.id,
          action: e.action,
          actorName: e.actor.name ?? e.actor.email,
          targetType: e.targetType,
          targetId: e.targetId,
          metadata: e.metadata as Record<string, unknown> | null,
          createdAt: e.createdAt.toISOString(),
        })),
      );
      setTotal(result.total);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={action}
          onValueChange={(v) => {
            const next = v as AuditAction | "ALL";
            setAction(next);
            setPage(1);
            refetch(next, 1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue>
              {action === "ALL" ? "All actions" : ACTION_LABEL[action]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      <div className="overflow-hidden rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No matching audit entries.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {e.createdAt.slice(0, 19).replace("T", " ")}
                </TableCell>
                <TableCell>{e.actorName}</TableCell>
                <TableCell>{ACTION_LABEL[e.action]}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {summarize(e)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                refetch(action, next);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                refetch(action, next);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
