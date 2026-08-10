"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { canChangeRole, canRemoveMember } from "@/lib/permissions";

import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
  type MemberFormState,
} from "./actions";

const initialMemberFormState: MemberFormState = { status: "idle" };

type Member = {
  id: string;
  userId: string;
  role: Role;
  name: string | null;
  email: string;
};
type Invite = { id: string; email: string; role: Role; expiresAt: string };

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
};

const ALL_ROLES: Role[] = ["MEMBER", "ADMIN", "OWNER"];
const ROLE_LABEL: Record<Role, string> = {
  MEMBER: "Member",
  ADMIN: "Admin",
  OWNER: "Owner",
};

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function InviteForm({ orgId }: { orgId: string }) {
  const bound = async (state: MemberFormState, formData: FormData) =>
    inviteMemberAction(orgId, state, formData);
  const [state, formAction] = useFormState(bound, initialMemberFormState);
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="invite-email">Invite by email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="teammate@company.com"
          className="mt-1.5"
          required
        />
        {state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>
      <div className="w-40">
        <Label htmlFor="invite-role">Role</Label>
        <Select
          name="role"
          value={inviteRole}
          onValueChange={(v) => setInviteRole(v as Role)}
          required
        >
          <SelectTrigger className="mt-1.5" id="invite-role">
            <SelectValue>{ROLE_LABEL[inviteRole]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="OWNER">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SubmitButton label="Send invite" pendingLabel="Sending…" />
      {state.status === "error" && state.message && (
        <p className="w-full text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

function RoleSelect({
  orgId,
  membershipId,
  currentRole,
  actorRole,
}: {
  orgId: string;
  membershipId: string;
  currentRole: Role;
  actorRole: Role;
}) {
  const [value, setValue] = useState<Role>(currentRole);

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        setValue(next as Role);
        changeRoleAction(orgId, membershipId, next as Role);
      }}
    >
      <SelectTrigger className="h-8 w-32">
        <SelectValue>{ROLE_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ALL_ROLES.map((r) => (
          <SelectItem
            key={r}
            value={r}
            disabled={!canChangeRole(actorRole, currentRole, r)}
          >
            {ROLE_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MembersPanel({
  orgId,
  currentUserId,
  currentUserRole,
  canInvite,
  canManage,
  members,
  invites,
}: {
  orgId: string;
  currentUserId: string;
  currentUserRole: Role;
  canInvite: boolean;
  canManage: boolean;
  members: Member[];
  invites: Invite[];
}) {
  const [localMembers, setLocalMembers] = useState(members);

  return (
    <div className="space-y-8">
      {canInvite && (
        <div className="rounded-sm border border-border bg-card p-4">
          <h2 className="font-medium text-foreground">Invite a teammate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            They&apos;ll get access once they sign up or sign in with this
            email.
          </p>
          <div className="mt-4">
            <InviteForm orgId={orgId} />
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium text-foreground">Pending invites</h2>
          <div className="overflow-hidden rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[i.role]}>{i.role}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i.expiresAt.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canInvite && (
                        <button
                          className="text-xs text-destructive hover:underline"
                          onClick={() => revokeInviteAction(orgId, i.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium text-foreground">Members</h2>
        <div className="overflow-hidden rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {localMembers.map((m) => {
                const isSelf = m.userId === currentUserId;
                const canRemove = canRemoveMember(
                  currentUserRole,
                  currentUserId,
                  m.userId,
                  m.role,
                );
                const canEditRole =
                  canManage &&
                  ALL_ROLES.some(
                    (r) =>
                      canChangeRole(currentUserRole, m.role, r) && r !== m.role,
                  );
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.name ?? "—"}{" "}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      {canEditRole ? (
                        <RoleSelect
                          orgId={orgId}
                          membershipId={m.id}
                          currentRole={m.role}
                          actorRole={currentUserRole}
                        />
                      ) : (
                        <Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canRemove && (
                        <AlertDialog>
                          <AlertDialogTrigger className="text-xs text-destructive hover:underline">
                            Remove
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {m.name ?? m.email}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                They&apos;ll immediately lose access to this
                                organization.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  await removeMemberAction(orgId, m.id);
                                  setLocalMembers((prev) =>
                                    prev.filter((x) => x.id !== m.id),
                                  );
                                }}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
