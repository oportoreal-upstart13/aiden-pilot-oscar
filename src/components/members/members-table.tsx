"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@upstart13-com/aiden-ui";
import { ORG_ROLES } from "@/config/rbac";
import { EmptyValue } from "@/components/tickets/ticket-badges";

export interface MemberRow {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: Date;
}

interface MembersTableProps {
  members: MemberRow[];
  /** The viewing owner, so the UI can refuse to let them demote themselves. */
  currentUserId: string;
}

const ROLE_VARIANT: Record<string, "default" | "primary" | "secondary"> = {
  owner: "default",
  agent: "primary",
  viewer: "secondary",
};

/**
 * Member list with inline role change.
 *
 * The role control is a `DropdownMenuRadioGroup` from `aiden-ui` rather
 * than a `Select`. `Select` is not shipped by the package and would have
 * to be installed via `npx shadcn add`, which needs a `components.json`
 * this repo does not have; a radio group is the shipped primitive for
 * picking one of a small fixed set, and `00-overview.md` says to reach
 * for a package primitive before installing anything.
 */
export function MembersTable({ members, currentUserId }: MembersTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function changeRole(member: MemberRow, role: string) {
    if (role === member.role) return;
    setPendingId(member.membershipId);

    const response = await fetch(`/api/admin/members/${member.membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setPendingId(null);

    if (!response.ok) {
      // 409 is the last-owner guard. Surface the server's own reason —
      // "the server rejected it" would leave the owner with no idea what
      // to do, and the fix (promote someone else first) is actionable.
      const reason =
        response.status === 409
          ? ((await response.json().catch(() => null)) as {
              error?: string;
            } | null)
          : null;

      toast.error("Could not change the role", {
        description:
          reason?.error ??
          (response.status === 403
            ? "Only an owner of this organization can manage members."
            : "The server rejected the change. Reload and try again."),
      });
      return;
    }

    toast.success(`${member.name ?? member.email} is now ${role}`, {
      description: "The change applies to their next request.",
    });
    router.refresh();
  }

  return (
    <div className="border-border overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="text-foreground font-semibold">
              Member
            </TableHead>
            <TableHead className="text-foreground hidden font-semibold sm:table-cell">
              Joined
            </TableHead>
            <TableHead className="text-foreground text-right font-semibold">
              Role
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            return (
              <TableRow key={member.membershipId} className="hover:bg-muted/50">
                <TableCell>
                  <p className="font-medium">{member.name ?? <EmptyValue />}</p>
                  <p className="text-muted-foreground text-sm">
                    {member.email}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm tabular-nums sm:table-cell">
                  {member.joinedAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {isSelf ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={ROLE_VARIANT[member.role] ?? "outline"}>
                        {member.role}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        you
                      </span>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === member.membershipId}
                          className="gap-1.5"
                        >
                          {pendingId === member.membershipId ? (
                            <Loader2
                              className="size-3.5 animate-spin"
                              strokeWidth={1.5}
                            />
                          ) : null}
                          {member.role}
                          <ChevronDown className="size-3.5" strokeWidth={1.5} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={member.role}
                          onValueChange={(role) =>
                            void changeRole(member, role)
                          }
                        >
                          {ORG_ROLES.map((role) => (
                            <DropdownMenuRadioItem key={role} value={role}>
                              {role}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
