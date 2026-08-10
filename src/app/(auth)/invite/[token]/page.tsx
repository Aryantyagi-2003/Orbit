import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getInviteByToken } from "@/lib/data/orgs";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const invite = await getInviteByToken(params.token);

  if (!invite) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-medium text-foreground">
          This invite is invalid or has expired
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask whoever invited you to send a new one from their
          organization&apos;s Members settings.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  const session = await auth();

  if (!session?.user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/invite/${params.token}`)}`,
    );
  }

  const roleLabel = invite.role.charAt(0) + invite.role.slice(1).toLowerCase();

  if (session.user.email !== invite.email) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Wrong account
        </h1>
        <p className="text-sm text-muted-foreground">
          This invite to <strong>{invite.org.name}</strong> was sent to{" "}
          <span className="font-mono text-xs">{invite.email}</span>, but
          you&apos;re signed in as{" "}
          <span className="font-mono text-xs">{session.user.email}</span>. Sign
          out and sign back in with the invited address to accept it.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Switch accounts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Join {invite.org.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You&apos;ve been invited to join as{" "}
          {roleLabel === "Owner" || roleLabel === "Admin" ? "an" : "a"}{" "}
          <strong>{roleLabel}</strong>.
        </p>
      </div>
      <AcceptInviteForm token={params.token} />
    </div>
  );
}
