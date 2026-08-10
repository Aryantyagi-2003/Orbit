import "server-only";

import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RecordAuditLogInput = {
  orgId: string;
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

// Accepts either the ambient `prisma` client or a `tx` handle from
// `prisma.$transaction`, so a mutation and its audit entry always commit or
// roll back together — there's no window where one happens without the other.
type PrismaLike = Pick<typeof prisma, "auditLog">;

export async function recordAuditLog(
  input: RecordAuditLogInput,
  client: PrismaLike = prisma,
) {
  await client.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  });
}

export type AuditLogFilters = {
  action?: AuditAction;
  actorId?: string;
  from?: Date;
  to?: Date;
};

export async function listAuditLog(
  orgId: string,
  filters: AuditLogFilters = {},
  page = 1,
  pageSize = 25,
) {
  const where: Prisma.AuditLogWhereInput = {
    orgId,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}
