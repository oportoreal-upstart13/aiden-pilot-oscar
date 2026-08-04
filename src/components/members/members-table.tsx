"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@upstart13-com/aiden-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MemberRow {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

interface MembersTableProps {
  members: MemberRow[];
  currentUserId: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  agent: "Agent",
  viewer: "Viewer",
};

export function MembersTable({ members, currentUserId }: MembersTableProps) {
  const router = useRouter();
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRoleChange(member: MemberRow, role: string) {
    setPendingRoleId(member.id);
    const res = await fetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setPendingRoleId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Failed to change role", {
        description: data.error ?? "Please try again.",
      });
      return;
    }

    toast.success("Role updated");
    router.refresh();
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setIsRemoving(true);
    const res = await fetch(`/api/admin/members/${removeTarget.id}`, {
      method: "DELETE",
    });
    setIsRemoving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Failed to remove member", {
        description: data.error ?? "Please try again.",
      });
      return;
    }

    toast.success("Member removed");
    setRemoveTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="border-border rounded-sm border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="text-foreground font-semibold">
                Name
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Email
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Role
              </TableHead>
              <TableHead className="text-foreground text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.user.id === currentUserId;
              return (
                <TableRow key={member.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {member.user.name ?? "—"}
                    {isSelf ? (
                      <Badge variant="secondary" className="ml-2">
                        You
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.user.email}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(role) => handleRoleChange(member, role)}
                      disabled={pendingRoleId === member.id}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        {pendingRoleId === member.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Remove {removeTarget?.user.name ?? removeTarget?.user.email}
            </DialogTitle>
            <DialogDescription>
              They&apos;ll lose access to this organization&apos;s tickets
              immediately. This can&apos;t be undone from here — they&apos;d
              need to be re-added.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
