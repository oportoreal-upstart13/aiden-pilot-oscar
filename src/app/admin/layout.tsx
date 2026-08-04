import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { abilities } from "@/lib/abilities";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Segment guard for everything under `/admin`. This is the safe default:
 * any page added under `admin/` is protected without remembering to copy a
 * per-page redirect block. Pages keep their own ability check as
 * defense-in-depth, but the layout is the backstop.
 *
 * Unauthenticated users go to /login; authenticated users without an admin
 * ability go to /dashboard.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");

  const canManageUsers = abilities.can(session as never, "users.manage");
  const canReadAudit = abilities.can(session as never, "audit.read");
  if (!canManageUsers && !canReadAudit) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
