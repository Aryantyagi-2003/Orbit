import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import {
  getOrgForMember,
  listUserOrganizations,
  NotAMemberError,
  NotFoundError,
} from "@/lib/data/orgs";
import { OrgNav } from "./org-nav";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  const user = await requireUser();

  let orgContext;
  try {
    orgContext = await getOrgForMember(user.id, params.orgId);
  } catch (error) {
    if (error instanceof NotAMemberError || error instanceof NotFoundError) {
      // Not a member of this org (including a tampered/guessed orgId in the
      // URL) — never leak whether the org exists, just bounce to a place
      // this user is actually authorized to be.
      redirect("/dashboard");
    }
    throw error;
  }

  const memberships = await listUserOrganizations(user.id);

  return (
    <div className="min-h-screen bg-background">
      <OrgNav
        orgId={params.orgId}
        orgName={orgContext.org.name}
        role={orgContext.role}
        userEmail={user.email ?? ""}
        allOrgs={memberships.map((m) => ({ id: m.org.id, name: m.org.name }))}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
