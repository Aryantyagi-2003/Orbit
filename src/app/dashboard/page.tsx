import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { listUserOrganizations } from "@/lib/data/orgs";

// Landing spot after sign-in. Not a real page — routes to the user's org
// (or onboarding, if they have none) since every real view is org-scoped.
export default async function DashboardRedirectPage() {
  const user = await requireUser();
  const memberships = await listUserOrganizations(user.id);

  if (memberships.length === 0) redirect("/onboarding");
  redirect(`/o/${memberships[0].org.id}/dashboard`);
}
