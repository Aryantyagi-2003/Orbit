"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { acceptInvite, InviteNotFoundError } from "@/lib/data/orgs";

export type AcceptInviteState = {
  status: "idle" | "error";
  message?: string;
};

export async function acceptInviteAction(
  token: string,
): Promise<AcceptInviteState> {
  const user = await requireUser();

  let orgId: string;
  try {
    const membership = await acceptInvite(user.id, user.email ?? "", token);
    orgId = membership.orgId;
  } catch (error) {
    if (error instanceof InviteNotFoundError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "Something went wrong accepting the invite. Try again.",
    };
  }

  redirect(`/o/${orgId}/dashboard`);
}
