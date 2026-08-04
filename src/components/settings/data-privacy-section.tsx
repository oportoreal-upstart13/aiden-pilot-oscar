"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@upstart13-com/aiden-auth/validations";
import { brand } from "@/config/brand";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
} from "@upstart13-com/aiden-ui";
import { toast } from "sonner";

export function DataPrivacySection() {
  return (
    <div className="space-y-6">
      <ExportCard />
      <DangerZone />
    </div>
  );
}

/** Slugify the brand name to match the server's export filename prefix. */
function brandSlug(): string {
  const slug = brand.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "export";
}

function ExportCard() {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      const res = await fetch("/api/me/export", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not export data", {
          description: "Please try again in a moment.",
        });
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? `${brandSlug()}-export.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export ready", { description: filename });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>
          Download a JSON snapshot of your profile, connected accounts, and
          audit history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            We email no copies — the download stays in your browser.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2
                  className="mr-1.5 size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Preparing…
              </>
            ) : (
              <>
                <Download className="mr-1.5 size-4" strokeWidth={1.5} />
                Export JSON
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Irreversible actions for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Permanently delete your account, connected providers, and session
              history. Audit log entries are retained for compliance.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="mr-1.5 size-4" strokeWidth={1.5} />
            Delete
          </Button>
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs">
          Need a copy before deleting? Use{" "}
          <span className="text-foreground font-medium">Export your data</span>{" "}
          above.
        </p>
      </CardContent>

      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirm: "" as DeleteAccountInput["confirm"] },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset({ confirm: "" as DeleteAccountInput["confirm"] });
    onOpenChange(next);
  }

  async function onSubmit() {
    const res = await fetch("/api/me", { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete account", {
        description: "Please try again in a moment.",
      });
      return;
    }
    toast.success("Account deleted");
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your profile, OAuth connections, and
            sessions. Audit log entries are retained. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="delete-account-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type{" "}
                    <span className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                      DELETE
                    </span>{" "}
                    to confirm
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="DELETE" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="delete-account-form"
            variant="destructive"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2
                  className="mr-1.5 size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Deleting…
              </>
            ) : (
              "Delete account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
