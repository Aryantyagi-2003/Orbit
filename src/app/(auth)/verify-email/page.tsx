import Link from "next/link";

import { Button } from "@/components/ui/button";
import { consumeVerificationToken } from "@/lib/data/users";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Check your inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to the email you signed up with. It can
          take a minute to arrive — if you don&apos;t see it, check spam before
          requesting another.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  const user = await consumeVerificationToken(token);

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-medium text-foreground">
          This link has expired
        </h1>
        <p className="text-sm text-muted-foreground">
          Verification links are valid for 24 hours. Sign up again with the same
          email to get a fresh one, or sign in if you&apos;ve already verified.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-2xl font-medium text-foreground">
        Email verified
      </h1>
      <p className="text-sm text-muted-foreground">
        {user.email} is confirmed. You can sign in now.
      </p>
      <Button asChild className="w-full">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
