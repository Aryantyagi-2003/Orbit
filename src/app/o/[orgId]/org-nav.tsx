"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "expenses", label: "Expenses" },
  { href: "budgets", label: "Budgets" },
  { href: "settings/members", label: "Members" },
  { href: "settings/audit-log", label: "Audit log" },
];

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
};

export function OrgNav({
  orgId,
  orgName,
  role,
  userEmail,
  allOrgs,
}: {
  orgId: string;
  orgName: string;
  role: Role;
  userEmail: string;
  allOrgs: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="font-serif text-lg font-medium text-foreground">
            Orbit
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium text-foreground hover:bg-accent">
              {orgName}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allOrgs.map((o) => (
                <DropdownMenuItem
                  key={o.id}
                  onSelect={() => router.push(`/o/${o.id}/dashboard`)}
                  className={cn(o.id === orgId && "font-medium")}
                >
                  {o.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/onboarding/new")}>
                Create organization…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted-foreground">
            {userEmail}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 px-6">
        {NAV_ITEMS.map((item) => {
          const href = `/o/${orgId}/${item.href}`;
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
