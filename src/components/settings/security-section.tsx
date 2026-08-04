"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { LogOut, Info } from "lucide-react";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@upstart13-com/aiden-auth/validations";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@upstart13-com/aiden-ui";
import { toast } from "sonner";

interface SigninEntry {
  id: string;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface SecuritySectionProps {
  hasPassword: boolean;
  credentialsEnabled: boolean;
  recentSignins: SigninEntry[];
}

const PASSWORD_ERROR_COPY: Record<string, string> = {
  wrong_password: "Current password is incorrect.",
  no_password_set: "No password is set on this account.",
  weak: "Password is too short or matches your current one.",
  credentials_disabled: "Password sign-in is disabled for this app.",
  user_not_found: "Your account could not be found.",
};

export function SecuritySection({
  hasPassword,
  credentialsEnabled,
  recentSignins,
}: SecuritySectionProps) {
  return (
    <div className="space-y-6">
      <RecentSigninsCard entries={recentSignins} />
      <PasswordCard
        hasPassword={hasPassword}
        credentialsEnabled={credentialsEnabled}
      />
      <SessionCard />
      <MultiDeviceNote />
    </div>
  );
}

function RecentSigninsCard({ entries }: { entries: SigninEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent sign-ins</CardTitle>
        <CardDescription>
          The last 10 successful sign-ins to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sign-in events recorded yet.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {entries.map((entry) => {
              const when = new Date(entry.timestamp);
              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {when.toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {entry.userAgent && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {entry.userAgent}
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground shrink-0 font-mono text-xs">
                    {entry.ipAddress ?? "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PasswordCard({
  hasPassword,
  credentialsEnabled,
}: {
  hasPassword: boolean;
  credentialsEnabled: boolean;
}) {
  if (!credentialsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Password sign-in is disabled for this app. Use one of your linked
            OAuth providers to sign in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            You sign in with an OAuth provider — no password is set on this
            account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PasswordChangeForm />;
}

function PasswordChangeForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        code?: string;
      } | null;
      const message =
        (data?.code && PASSWORD_ERROR_COPY[data.code]) ??
        "Could not change password. Please try again.";
      if (data?.code === "wrong_password") {
        form.setError("currentPassword", { message });
      } else if (data?.code === "weak") {
        form.setError("newPassword", { message });
      } else {
        toast.error("Could not change password", { description: message });
      }
      return;
    }
    toast.success("Password updated");
    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Use at least 8 characters. You&apos;ll stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Update password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SessionCard() {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>This device</CardTitle>
        <CardDescription>
          Sign out of the current browser session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm">
            You&apos;re signed in on this device. Signing out clears your
            session token here.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut({ callbackUrl: "/" });
            }}
          >
            <LogOut className="mr-1.5 size-4" strokeWidth={1.5} />
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MultiDeviceNote() {
  return (
    <div className="bg-muted/40 border-border flex items-start gap-3 rounded-xl border p-4">
      <Info
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        strokeWidth={1.5}
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        Multi-device session management (listing every active device and
        revoking individual sessions) requires switching auth to database
        sessions. The starter ships with JWT sessions by default. See the
        <code className="bg-muted mx-1 rounded-sm px-1 py-0.5 font-mono">
          aiden-auth
        </code>
        README for the migration path.
      </p>
    </div>
  );
}
