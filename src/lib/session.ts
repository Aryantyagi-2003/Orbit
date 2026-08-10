import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/** Every server action and server component that requires a signed-in user goes through this. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}
