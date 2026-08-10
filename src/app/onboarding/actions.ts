"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { createOrganization } from "@/lib/data/orgs";
import { createOrgSchema } from "@/lib/validations/org";

export type CreateOrgState = {
  status: "idle" | "error";
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

export async function createOrgAction(
  _prevState: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const user = await requireUser();

  const parsed = createOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let orgId: string;
  try {
    const org = await createOrganization(user.id, parsed.data);
    orgId = org.id;
  } catch {
    return {
      status: "error",
      message: "Something went wrong creating your organization. Try again.",
    };
  }

  redirect(`/o/${orgId}/dashboard`);
}
