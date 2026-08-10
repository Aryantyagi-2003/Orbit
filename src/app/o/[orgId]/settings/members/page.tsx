import { requireUser } from "@/lib/session";
import {
  getOrgForMember,
  listMembers,
  listPendingInvites,
} from "@/lib/data/orgs";
import { can } from "@/lib/permissions";
import { MembersPanel } from "./members-panel";

export default async function MembersPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  const [members, invites, { role }] = await Promise.all([
    listMembers(user.id, params.orgId),
    listPendingInvites(user.id, params.orgId),
    getOrgForMember(user.id, params.orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access and what they can do.
        </p>
      </div>
      <MembersPanel
        orgId={params.orgId}
        currentUserId={user.id}
        currentUserRole={role}
        canInvite={can(role, "invite:create")}
        canManage={can(role, "member:manage")}
        members={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </div>
  );
}
