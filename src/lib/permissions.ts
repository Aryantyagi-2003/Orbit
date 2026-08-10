import type { Role } from "@prisma/client";

// The approved RBAC matrix, as code. This is the single source of truth for
// "who can do what" — every mutation in /lib/data calls into this instead of
// re-deriving its own role checks, so the matrix only exists in one place.

type FlatAction =
  | "expense:create"
  | "expense:edit_any"
  | "expense:delete_any"
  | "category:manage"
  | "budget:manage"
  | "invite:create"
  | "invite:revoke"
  | "member:manage"
  | "org:settings_edit"
  | "org:delete"
  | "org:transfer_ownership"
  | "audit_log:view";

const MATRIX: Record<FlatAction, readonly Role[]> = {
  "expense:create": ["OWNER", "ADMIN", "MEMBER"],
  "expense:edit_any": ["OWNER", "ADMIN"],
  "expense:delete_any": ["OWNER", "ADMIN"],
  "category:manage": ["OWNER", "ADMIN"],
  "budget:manage": ["OWNER", "ADMIN"],
  "invite:create": ["OWNER", "ADMIN"],
  "invite:revoke": ["OWNER", "ADMIN"],
  "member:manage": ["OWNER", "ADMIN"],
  "org:settings_edit": ["OWNER", "ADMIN"],
  "org:delete": ["OWNER"],
  "org:transfer_ownership": ["OWNER"],
  "audit_log:view": ["OWNER", "ADMIN"],
};

export function can(role: Role, action: FlatAction): boolean {
  return MATRIX[action].includes(role);
}

/** Can this expense be edited/deleted by this actor? Owning it is always enough. */
export function canMutateExpense(
  actorRole: Role,
  actorUserId: string,
  expenseSubmittedById: string,
): boolean {
  if (actorUserId === expenseSubmittedById) return true;
  return can(actorRole, "expense:edit_any");
}

/** An Admin can invite Members and Admins, never Owners. Only an Owner can invite an Owner. */
export function canInviteWithRole(actorRole: Role, targetRole: Role): boolean {
  if (!can(actorRole, "invite:create")) return false;
  if (targetRole === "OWNER") return actorRole === "OWNER";
  return true;
}

/**
 * Role changes: an Admin can move people between MEMBER and ADMIN, but can
 * never touch anyone who currently is, or would become, an OWNER — only an
 * Owner can promote to or demote from Owner.
 */
export function canChangeRole(
  actorRole: Role,
  currentTargetRole: Role,
  newTargetRole: Role,
): boolean {
  if (!can(actorRole, "member:manage")) return false;
  if (currentTargetRole === "OWNER" || newTargetRole === "OWNER") {
    return actorRole === "OWNER";
  }
  return true;
}

/**
 * Removing a member: Owners/Admins can remove Members and Admins. An Owner
 * can only be removed by themself (and the last-owner check happens
 * separately, in the data layer, since it needs a DB count).
 */
export function canRemoveMember(
  actorRole: Role,
  actorUserId: string,
  targetUserId: string,
  targetRole: Role,
): boolean {
  if (targetRole === "OWNER") {
    return actorRole === "OWNER" && actorUserId === targetUserId;
  }
  return can(actorRole, "member:manage");
}
