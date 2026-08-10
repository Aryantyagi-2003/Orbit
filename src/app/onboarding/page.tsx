import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { listUserOrganizations } from "@/lib/data/orgs";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await listUserOrganizations(user.id);

  if (memberships.length > 0) {
    redirect(`/o/${memberships[0].org.id}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Set up your organization
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This is the ledger every teammate you invite will share.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
