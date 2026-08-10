import { z } from "zod";

export const orgNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters")
  .max(80, "Organization name must be at most 80 characters");

export const createOrgSchema = z.object({
  name: orgNameSchema,
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

// Shape validation only — whether THIS actor may invite someone as OWNER is
// an authorization decision, made by canInviteWithRole() in the data layer,
// not a validation rule (an Owner is allowed to invite another Owner).
export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .toLowerCase(),
  role: roleSchema,
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const changeRoleSchema = z.object({
  membershipId: z.string().min(1),
  newRole: roleSchema,
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
