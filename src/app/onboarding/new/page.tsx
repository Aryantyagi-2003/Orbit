import { requireUser } from "@/lib/session";
import { OnboardingForm } from "../onboarding-form";

// Unlike /onboarding, this is reachable even if the user already belongs to
// an org — it's how "Create organization…" in the org switcher gets here.
export default async function NewOrgPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Create another organization
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;ll be its Owner. Your other organizations stay untouched.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
