"use client";

import { useState } from "react";
import { Loader2, MoreVertical, Search, ShieldCheck } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@upstart13-com/aiden-ui";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  createdAt: string;
  roles: string[];
}

interface RoleOption {
  name: string;
  description: string | null;
}

interface UsersTableProps {
  initialUsers: UserRow[];
  initialNextCursor: string | null;
  availableRoles: RoleOption[];
  currentUserId: string;
}

export function UsersTable({
  initialUsers,
  initialNextCursor,
  availableRoles,
  currentUserId,
}: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  async function runSearch(query: string) {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "25");
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        toast.error("Search failed");
        return;
      }
      const data = (await res.json()) as {
        users: Array<UserRow & { createdAt: string }>;
        nextCursor: string | null;
      };
      setUsers(
        data.users.map((u) => ({
          ...u,
          // API returns role objects; normalize.
          roles: (u as unknown as { roles: Array<{ name: string }> | string[] })
            .roles
            ? Array.isArray(
                (u as unknown as { roles: Array<{ name: string }> | string[] })
                  .roles
              ) &&
              (u as unknown as { roles: unknown[] }).roles.length > 0 &&
              typeof (u as unknown as { roles: unknown[] }).roles[0] ===
                "object"
              ? (u as unknown as { roles: Array<{ name: string }> }).roles.map(
                  (r) => r.name
                )
              : (u.roles as string[])
            : [],
        }))
      );
      setNextCursor(data.nextCursor);
    } finally {
      setSearching(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("limit", "25");
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        toast.error("Could not load more users");
        return;
      }
      const data = (await res.json()) as {
        users: Array<{
          id: string;
          email: string | null;
          name: string | null;
          image: string | null;
          createdAt: string;
          roles: Array<{ name: string }>;
        }>;
        nextCursor: string | null;
      };
      setUsers((prev) => [
        ...prev,
        ...data.users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          createdAt: u.createdAt,
          roles: u.roles.map((r) => r.name),
        })),
      ]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function applyRoleUpdate(userId: string, roles: string[]) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles } : u))
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex items-center justify-between gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(search);
        }}
      >
        <div className="relative max-w-xs flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      <div className="border-border rounded-sm border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="text-foreground font-semibold">
                User
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Roles
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Joined
              </TableHead>
              <TableHead className="text-foreground w-12 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={u.image ?? undefined} alt="" />
                        <AvatarFallback className="text-xs font-medium">
                          {initialsFor(u.name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.name ?? "—"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {u.email ?? "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.roles.length === 0 ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={`Actions for ${u.name ?? u.email ?? "user"}`}
                        >
                          <MoreVertical className="size-4" strokeWidth={1.5} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setEditing(u)}>
                          <ShieldCheck
                            className="mr-2 size-4"
                            strokeWidth={1.5}
                          />
                          Edit roles
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2
                  className="mr-1.5 size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      <RoleEditDialog
        user={editing}
        availableRoles={availableRoles}
        currentUserId={currentUserId}
        onClose={() => setEditing(null)}
        onSaved={(roles) => {
          if (editing) applyRoleUpdate(editing.id, roles);
          setEditing(null);
        }}
      />
    </div>
  );
}

function RoleEditDialog({
  user,
  availableRoles,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  availableRoles: RoleOption[];
  currentUserId: string;
  onClose: () => void;
  onSaved: (roles: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastAdminError, setLastAdminError] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected([]);
      setLastAdminError(false);
      onClose();
    }
  }

  function toggle(role: string) {
    setLastAdminError(false);
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  // Sync internal state when a new user is opened.
  // (Avoid useEffect ping-pong by keying on `user?.id`.)
  const openUserId = user?.id ?? null;
  const [trackedId, setTrackedId] = useState<string | null>(null);
  if (openUserId !== trackedId) {
    setTrackedId(openUserId);
    setSelected(user?.roles ?? []);
    setLastAdminError(false);
  }

  async function handleSave() {
    if (!user) return;
    setSubmitting(true);
    setLastAdminError(false);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selected }),
      });
      if (res.status === 409) {
        setLastAdminError(true);
        return;
      }
      if (!res.ok) {
        toast.error("Could not update roles");
        return;
      }
      toast.success("Roles updated");
      onSaved(selected);
    } finally {
      setSubmitting(false);
    }
  }

  const isSelf = user?.id === currentUserId;

  return (
    <Dialog open={user !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit roles{user?.name ? ` — ${user.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            {user?.email ?? "Assign or revoke roles for this user."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Roles
            </p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => {
                const isSelected = selected.includes(role.name);
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => toggle(role.name)}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    {role.name}
                  </button>
                );
              })}
            </div>
            {availableRoles.find((r) => r.name === "admin")?.description && (
              <p className="text-muted-foreground text-xs">
                Admins can manage other users and read the audit log.
              </p>
            )}
          </div>

          {isSelf &&
            selected.includes("admin") === false &&
            user?.roles.includes("admin") && (
              <p className="text-warning text-xs">
                You&apos;re removing your own admin role. Make sure another
                admin exists.
              </p>
            )}

          {lastAdminError && (
            <p className="text-destructive text-xs">
              Cannot remove admin from the last admin. Promote another user
              first.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2
                  className="mr-1.5 size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialsFor(name: string | null, email: string | null): string {
  const src = name || email || "U";
  return (
    src
      .split(/[\s@]/)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}
