"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

import { requireUser } from "@/lib/session";
import {
  changeMemberRole,
  createInvite,
  removeMember,
  revokeInvite,
  ForbiddenError,
  LastOwnerError,
  NotAMemberError,
  NotFoundError,
} from "@/lib/data/orgs";
import { inviteSchema } from "@/lib/validations/org";
import { sendInviteEmail } from "@/lib/email";

export type MemberFormState = {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

function mapError(error: unknown): MemberFormState {
  if (error instanceof ForbiddenError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof LastOwnerError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof NotAMemberError) {
    return {
      status: "error",
      message: "You're not a member of this organization.",
    };
  }
  if (error instanceof NotFoundError) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: "Something went wrong. Try again." };
}

export async function inviteMemberAction(
  orgId: string,
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const user = await requireUser();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const invite = await createInvite(user.id, orgId, parsed.data);
    await sendInviteEmail(
      invite.email,
      invite.token,
      invite.org.name,
      invite.invitedBy.name ?? invite.invitedBy.email,
      invite.role,
    );
  } catch (error) {
    return mapError(error);
  }

  revalidatePath(`/o/${orgId}/settings/members`);
  return {
    status: "success",
    message: `Invite sent to ${parsed.data.email}.`,
  };
}

export async function changeRoleAction(
  orgId: string,
  membershipId: string,
  newRole: Role,
): Promise<MemberFormState> {
  const user = await requireUser();
  try {
    await changeMemberRole(user.id, orgId, membershipId, newRole);
  } catch (error) {
    return mapError(error);
  }
  revalidatePath(`/o/${orgId}/settings/members`);
  return { status: "success" };
}

export async function removeMemberAction(
  orgId: string,
  membershipId: string,
): Promise<MemberFormState> {
  const user = await requireUser();
  try {
    await removeMember(user.id, orgId, membershipId);
  } catch (error) {
    return mapError(error);
  }
  revalidatePath(`/o/${orgId}/settings/members`);
  return { status: "success" };
}

export async function revokeInviteAction(orgId: string, inviteId: string) {
  const user = await requireUser();
  await revokeInvite(user.id, orgId, inviteId);
  revalidatePath(`/o/${orgId}/settings/members`);
}
