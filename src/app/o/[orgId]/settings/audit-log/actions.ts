"use server";

import type { AuditAction } from "@prisma/client";

import { requireUser } from "@/lib/session";
import { listAuditLog } from "@/lib/data/audit";
import { requireMembership } from "@/lib/data/orgs";
import { can } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/data/orgs";

export async function fetchAuditLogAction(
  orgId: string,
  filters: { action?: AuditAction; from?: string; to?: string },
  page: number,
) {
  const user = await requireUser();
  const membership = await requireMembership(user.id, orgId);
  if (!can(membership.role, "audit_log:view")) throw new ForbiddenError();

  return listAuditLog(
    orgId,
    {
      action: filters.action,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    },
    page,
  );
}
