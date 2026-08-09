import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl text-foreground">
        Signed in as {session.user.email}
      </h1>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        user_id {session.user.id}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Org creation, expense/budget CRUD, the dashboard charts, member
        settings, and the audit log land in the next layers.
      </p>
    </div>
  );
}
