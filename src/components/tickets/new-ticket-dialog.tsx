"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@upstart13-com/aiden-ui";
import { CreateTicketBody } from "@/lib/validations/tickets";

type FormValues = z.infer<typeof CreateTicketBody>;

/**
 * Create-ticket dialog.
 *
 * The Zod schema is the **same object the API route validates with** —
 * `CreateTicketBody` from `src/lib/validations/tickets`. That module is
 * pure Zod with no SDK imports precisely so a client component can import
 * it without dragging `aiden-security` and pino into the browser bundle;
 * `parseQuery` was moved to `src/lib/security.ts` for that reason (D2).
 * One schema, so the client cannot drift from the server contract.
 */
export function NewTicketDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateTicketBody),
    defaultValues: { subject: "", body: "" },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    setOpen(next);
  }

  async function onSubmit(values: FormValues) {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      toast.error("Could not create the ticket", {
        description:
          response.status === 403
            ? "Your role in this organization cannot create tickets."
            : "The server rejected the request. Check the fields and try again.",
      });
      return;
    }

    // The route returns { ticket }, classified when triage succeeded and
    // with null priority/category/sentiment when it did not.
    const { ticket } = (await response.json()) as {
      ticket: { id: string; priority: string | null };
    };

    toast.success("Ticket created", {
      description: ticket.priority
        ? `Classified as ${ticket.priority} priority.`
        : "AI classification was unavailable, so it is filed unclassified.",
    });

    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" strokeWidth={1.5} />
          New ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>
            Describe the customer&apos;s problem. Priority, category and
            sentiment are filled in automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-2"
          >
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Checkout fails on the payment step"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What happened, when it started, and how many customers are affected."
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste the customer&apos;s message. It is treated as data,
                    never as instructions to the AI.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                    Creating…
                  </>
                ) : (
                  "Create ticket"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
