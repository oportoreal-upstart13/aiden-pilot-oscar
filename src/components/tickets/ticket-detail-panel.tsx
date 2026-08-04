"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAIStream } from "@upstart13-com/aiden-realtime/react";
import { Loader2, Sparkles, Send } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@upstart13-com/aiden-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TicketDetailPanelProps {
  ticketId: string;
  body: string;
  status: string;
  canManage: boolean;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

export function TicketDetailPanel({
  ticketId,
  body,
  status,
  canManage,
}: TicketDetailPanelProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const draft = useAIStream<{ instructions?: string }>(
    `/api/tickets/${ticketId}/draft`
  );

  async function handleStatusChange(next: string) {
    setIsUpdatingStatus(true);
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setIsUpdatingStatus(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Failed to update status", {
        description: data.error ?? "Please try again.",
      });
      return;
    }

    setCurrentStatus(next);
    toast.success("Status updated");
    router.refresh();
  }

  async function handleClose() {
    setIsClosing(true);
    const res = await fetch(`/api/tickets/${ticketId}/close`, {
      method: "POST",
    });
    setIsClosing(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Failed to close ticket", {
        description: data.error ?? "Please try again.",
      });
      return;
    }

    setCurrentStatus("closed");
    toast.success("Ticket closed");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm whitespace-pre-wrap">
              {body}
            </p>
          </CardContent>
        </Card>

        {canManage ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent size-4" strokeWidth={1.5} />
                Draft reply
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => draft.send({})}
                disabled={draft.isLoading}
              >
                {draft.isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Drafting…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" strokeWidth={1.5} />
                    {draft.text ? "Draft again" : "Draft reply"}
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {draft.error ? (
                <p className="text-destructive text-sm">
                  {draft.error.message ||
                    "Failed to draft a reply — the AI provider may be unavailable."}
                </p>
              ) : draft.text ? (
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {draft.text}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Stream a suggested reply to this customer, token by token.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={!canManage || isUpdatingStatus}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && currentStatus !== "closed" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleClose}
                disabled={isClosing}
              >
                {isClosing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Closing…
                  </>
                ) : (
                  "Close ticket"
                )}
              </Button>
            ) : null}
            {!canManage ? (
              <p className="text-muted-foreground text-xs">
                Read-only — only the ticket&apos;s owning agent can change
                status or draft a reply.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
