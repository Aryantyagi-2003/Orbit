import "server-only";

import { randomUUID } from "crypto";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  can,
  canChangeRole,
  canInviteWithRole,
  canRemoveMember,
} from "@/lib/permissions";
import type { CreateOrgInput, InviteInput } from "@/lib/validations/org";
import { recordAuditLog } from "@/lib/data/audit";

export class NotAMemberError extends Error {
  constructor() {
    super("You are not a member of this organization.");
    this.name = "NotAMemberError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class LastOwnerError extends Error {
  constructor() {
    super("An organization must always have at least one Owner.");
    this.name = "LastOwnerError";
  }
}

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Travel", color: "chart-1" },
  { name: "Software", color: "chart-2" },
  { name: "Meals", color: "chart-3" },
  { name: "Office", color: "chart-4" },
  { name: "Marketing", color: "chart-5" },
  { name: "Other", color: "chart-6" },
];

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

/**
 * The single choke point every org-scoped data function calls through.
 * Re-derives the caller's role from the database on every call — never
 * accepts a role from the caller, a session claim, or anything the client
 * could have tampered with. This is what makes a raw server-action call
 * with a forged orgId fail: there's no membership row, so this throws.
 */
export async function requireMembership(userId: string, orgId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new NotAMemberError();
  return membership;
}

export async function createOrganization(
  userId: string,
  input: CreateOrgInput,
) {
  const baseSlug = slugify(input.name);

  return prisma.$transaction(async (tx) => {
    let slug = baseSlug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await tx.organization.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
    }

    const org = await tx.organization.create({
      data: { name: input.name, slug },
    });

    await tx.membership.create({
      data: { userId, orgId: org.id, role: "OWNER" },
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, orgId: org.id })),
    });

    await recordAuditLog(
      {
        orgId: org.id,
        actorId: userId,
        action: "ORG_CREATED",
        targetType: "organization",
        targetId: org.id,
      },
      tx,
    );

    return org;
  });
}

export async function listUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ org: m.org, role: m.role }));
}

export async function getOrgForMember(userId: string, orgId: string) {
  const membership = await requireMembership(userId, orgId);
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new NotFoundError("Organization not found.");
  return { org, role: membership.role };
}

export async function listCategories(userId: string, orgId: string) {
  await requireMembership(userId, orgId);
  return prisma.category.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });
}

export async function listMembers(userId: string, orgId: string) {
  await requireMembership(userId, orgId);
  return prisma.membership.findMany({
    where: { orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function countOwners(
  orgId: string,
  client: Pick<typeof prisma, "membership"> = prisma,
) {
  return client.membership.count({ where: { orgId, role: "OWNER" } });
}

export async function changeMemberRole(
  actorUserId: string,
  orgId: string,
  membershipId: string,
  newRole: Role,
) {
  const actor = await requireMembership(actorUserId, orgId);

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, orgId },
  });
  if (!target) throw new NotFoundError("Member not found.");

  if (!canChangeRole(actor.role, target.role, newRole)) {
    throw new ForbiddenError();
  }

  return prisma.$transaction(async (tx) => {
    if (target.role === "OWNER" && newRole !== "OWNER") {
      const owners = await countOwners(orgId, tx);
      if (owners <= 1) throw new LastOwnerError();
    }

    const updated = await tx.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    });

    await recordAuditLog(
      {
        orgId,
        actorId: actorUserId,
        action: "MEMBER_ROLE_CHANGED",
        targetType: "membership",
        targetId: membershipId,
        metadata: {
          fromRole: target.role,
          toRole: newRole,
          targetUserId: target.userId,
        },
      },
      tx,
    );

    return updated;
  });
}

export async function removeMember(
  actorUserId: string,
  orgId: string,
  membershipId: string,
) {
  const actor = await requireMembership(actorUserId, orgId);

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, orgId },
  });
  if (!target) throw new NotFoundError("Member not found.");

  if (!canRemoveMember(actor.role, actorUserId, target.userId, target.role)) {
    throw new ForbiddenError();
  }

  return prisma.$transaction(async (tx) => {
    if (target.role === "OWNER") {
      const owners = await countOwners(orgId, tx);
      if (owners <= 1) throw new LastOwnerError();
    }

    await tx.membership.delete({ where: { id: membershipId } });

    await recordAuditLog(
      {
        orgId,
        actorId: actorUserId,
        action: "MEMBER_REMOVED",
        targetType: "membership",
        targetId: membershipId,
        metadata: { removedUserId: target.userId, removedRole: target.role },
      },
      tx,
    );
  });
}

export async function createInvite(
  actorUserId: string,
  orgId: string,
  input: InviteInput,
) {
  const actor = await requireMembership(actorUserId, orgId);

  if (!canInviteWithRole(actor.role, input.role)) {
    throw new ForbiddenError();
  }

  const existingMember = await prisma.membership.findFirst({
    where: { orgId, user: { email: input.email } },
  });
  if (existingMember) {
    throw new ForbiddenError("This person is already a member.");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.invite.upsert({
      where: { orgId_email: { orgId, email: input.email } },
      create: {
        orgId,
        email: input.email,
        role: input.role,
        token,
        invitedById: actorUserId,
        expiresAt,
      },
      update: {
        role: input.role,
        token,
        invitedById: actorUserId,
        expiresAt,
        acceptedAt: null,
      },
    });

    await recordAuditLog(
      {
        orgId,
        actorId: actorUserId,
        action: "MEMBER_INVITED",
        targetType: "invite",
        targetId: invite.id,
        metadata: { email: input.email, role: input.role },
      },
      tx,
    );

    return invite;
  });
}

export async function listPendingInvites(userId: string, orgId: string) {
  await requireMembership(userId, orgId);
  return prisma.invite.findMany({
    where: { orgId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvite(
  actorUserId: string,
  orgId: string,
  inviteId: string,
) {
  const actor = await requireMembership(actorUserId, orgId);
  if (!can(actor.role, "invite:revoke")) throw new ForbiddenError();

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, orgId },
  });
  if (!invite) throw new NotFoundError("Invite not found.");

  await prisma.$transaction(async (tx) => {
    await tx.invite.delete({ where: { id: inviteId } });
    await recordAuditLog(
      {
        orgId,
        actorId: actorUserId,
        action: "INVITE_REVOKED",
        targetType: "invite",
        targetId: inviteId,
        metadata: { email: invite.email },
      },
      tx,
    );
  });
}

export class InviteNotFoundError extends Error {
  constructor() {
    super("This invite is invalid or has expired.");
    this.name = "InviteNotFoundError";
  }
}

export async function acceptInvite(
  userId: string,
  userEmail: string,
  token: string,
) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new InviteNotFoundError();
  }
  if (invite.email !== userEmail) {
    // Deliberately the same error as "not found" — don't reveal that a
    // valid invite exists for a different email address.
    throw new InviteNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({
      where: { userId_orgId: { userId, orgId: invite.orgId } },
    });

    const membership =
      existing ??
      (await tx.membership.create({
        data: { userId, orgId: invite.orgId, role: invite.role },
      }));

    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return membership;
  });
}
