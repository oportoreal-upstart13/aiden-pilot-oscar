"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@upstart13-com/aiden-ui";

export interface OrgOption {
  orgId: string;
  name: string;
  role: string;
}

interface OrgSwitcherProps {
  organizations: OrgOption[];
  activeOrgId: string;
}

/**
 * Active-organization switcher.
 *
 * Posts to `/api/orgs/switch`, which is the authority: it re-reads the
 * caller's `Membership` and 404s a target they do not belong to, so this
 * control cannot grant access by sending a different id. On success the
 * server sets the `deskline_org` cookie and `router.refresh()` re-renders
 * every server component against the new organization.
 */
export function OrgSwitcher({ organizations, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = organizations.find((org) => org.orgId === activeOrgId);

  // A caller with one organization has nothing to switch to. Rendering a
  // dropdown that can only reselect the current value is noise.
  if (organizations.length < 2) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Building2 className="size-4" strokeWidth={1.5} />
        <span className="text-foreground font-medium">
          {active?.name ?? "No organization"}
        </span>
        {active ? <Badge variant="secondary">{active.role}</Badge> : null}
      </div>
    );
  }

  async function switchTo(orgId: string) {
    setOpen(false);
    const response = await fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });

    if (!response.ok) {
      toast.error("Could not switch organization", {
        description:
          response.status === 404
            ? "You are no longer a member of that organization."
            : "The server rejected the switch. Try again.",
      });
      return;
    }

    const target = organizations.find((org) => org.orgId === orgId);
    toast.success(`Switched to ${target?.name ?? "organization"}`, {
      description: "Tickets, members, audit and spend now show that organization.",
    });
    startTransition(() => router.refresh());
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {pending ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Building2 className="size-4" strokeWidth={1.5} />
          )}
          <span className="max-w-[12rem] truncate">
            {active?.name ?? "Select organization"}
          </span>
          <ChevronsUpDown
            className="text-muted-foreground size-3.5"
            strokeWidth={1.5}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.orgId}
            onSelect={() => void switchTo(org.orgId)}
            className="gap-2"
          >
            <Check
              className={
                org.orgId === activeOrgId
                  ? "size-4 shrink-0"
                  : "size-4 shrink-0 opacity-0"
              }
              strokeWidth={1.5}
            />
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            <Badge variant="secondary">{org.role}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
