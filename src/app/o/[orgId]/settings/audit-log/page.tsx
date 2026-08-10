import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { getOrgForMember } from "@/lib/data/orgs";
import { listAuditLog } from "@/lib/data/audit";
import { can } from "@/lib/permissions";
import { AuditLogPanel } from "./audit-log-panel";

export default async function AuditLogPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  const { role } = await getOrgForMember(user.id, params.orgId);

  if (!can(role, "audit_log:view")) {
    redirect(`/o/${params.orgId}/dashboard`);
  }

  const initial = await listAuditLog(params.orgId, {}, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who did what, when — role changes, member removal, budget and expense
          edits, org settings.
        </p>
      </div>
      <AuditLogPanel
        orgId={params.orgId}
        initialEntries={initial.entries.map((e) => ({
          id: e.id,
          action: e.action,
          actorName: e.actor.name ?? e.actor.email,
          targetType: e.targetType,
          targetId: e.targetId,
          metadata: e.metadata as Record<string, unknown> | null,
          createdAt: e.createdAt.toISOString(),
        }))}
        initialTotal={initial.total}
      />
    </div>
  );
}
