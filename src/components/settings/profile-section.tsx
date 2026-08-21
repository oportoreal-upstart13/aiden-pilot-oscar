"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@upstart13-com/aiden-auth/validations";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
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

interface ProfileSectionProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string;
    accounts: Array<{ provider: string; providerAccountId: string }>;
    roles: Array<{ name: string; description: string | null }>;
  };
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(user.name ?? "");

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name ?? "" },
  });

  async function onSubmit(values: UpdateProfileInput) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("Could not save profile", {
        description:
          res.status === 400
            ? "Please check the fields below."
            : "Something went wrong. Please try again.",
      });
      return;
    }
    toast.success("Profile updated");
    setDisplayName(values.name ?? "");
    form.reset(values);
  }

  const initials =
    (displayName || user.email || "U")
      .split(/[\s@]/)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>
            How your name appears across the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-12 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Display name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    form.formState.isSubmitting || !form.formState.isDirty
                  }
                >
                  {form.formState.isSubmitting ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Read-only details about your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground w-32 shrink-0 text-sm">
                Email
              </dt>
              <dd className="text-foreground truncate text-right text-sm font-medium">
                {user.email ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground w-32 shrink-0 text-sm">
                Member since
              </dt>
              <dd className="text-foreground text-right text-sm font-medium">
                {memberSince}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground w-32 shrink-0 text-sm">
                User ID
              </dt>
              <dd className="text-muted-foreground truncate text-right font-mono text-xs">
                {user.id}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>
            OAuth providers linked to this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No OAuth providers connected.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.accounts.map((a) => (
                <Badge key={a.provider} variant="secondary" className="gap-1.5">
                  <span className="bg-success size-1.5 rounded-full" />
                  {a.provider}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your roles</CardTitle>
          <CardDescription>
            Roles determine what you can access. Contact an admin to change
            them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.roles.length === 0 ? (
            <p className="text-muted-foreground text-sm">No roles assigned.</p>
          ) : (
            <ul className="space-y-3">
              {user.roles.map((r) => (
                <li
                  key={r.name}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.name}</p>
                    {r.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{r.name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
