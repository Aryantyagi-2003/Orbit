import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { listUserOrganizations, listPendingInvitesForEmail } from "@/lib/data/orgs";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await listUserOrganizations(user.id);

  if (memberships.length > 0) {
    redirect(`/o/${memberships[0].org.id}/dashboard`);
  }

  // Catches the case where someone was invited but signed up (or signed in)
  // through a path that didn't carry the invite link's callbackUrl all the
  // way through — e.g. credentials signup, which detours through email
  // verification before a session exists. They land here with no org yet;
  // surface the invite instead of only offering "create a new one".
  const pendingInvites = await listPendingInvitesForEmail(user.email ?? "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        {pendingInvites.length > 0 && (
          <div className="space-y-3 rounded-sm border border-border bg-card p-4">
            <h2 className="font-medium text-foreground">
              You&apos;ve been invited
            </h2>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3"
              >
                <p className="text-sm text-muted-foreground">
                  Join <strong className="text-foreground">{invite.org.name}</strong>{" "}
                  as {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
                </p>
                <Button asChild size="sm">
                  <Link href={`/invite/${invite.token}`}>Accept</Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        <div>
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Set up your organization
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This is the ledger every teammate you invite will share.
            </p>
          </div>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
  );
}
