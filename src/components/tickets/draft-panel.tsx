"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAIStream } from "@upstart13-com/aiden-realtime/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
  cn,
} from "@upstart13-com/aiden-ui";
import { DRAFT_TONES, type DraftTone } from "@/lib/validations/tickets";

interface DraftPanelProps {
  ticketId: string;
  /** False for viewers and owners — the server denies them with a 403. */
  canDraft: boolean;
}

/**
 * Live AI draft panel.
 *
 * `useAIStream` consumes the SSE response from
 * `POST /api/tickets/[id]/draft`. The reply streams in token by token,
 * and the agent edits it here before sending it anywhere — nothing this
 * panel produces reaches a customer on its own.
 *
 * The control is hidden for roles that cannot draft, but that is sugar:
 * the route runs the full perimeter and answers 403 regardless of what
 * the client renders.
 */
export function DraftPanel({ ticketId, canDraft }: DraftPanelProps) {
  const [tone, setTone] = useState<DraftTone>("neutral");
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { text, isLoading, error, send, reset } = useAIStream<{
    tone: DraftTone;
  }>(`/api/tickets/${ticketId}/draft`);

  // While streaming, show the stream. Once the agent types, their edit wins.
  const value = edited ?? text;
  const hasDraft = value.length > 0;

  async function handleGenerate() {
    setEdited(null);
    setCopied(false);
    await send({ tone });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Draft copied", {
      description: "Paste it into your reply and edit before sending.",
    });
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!canDraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft reply</CardTitle>
          <CardDescription>
            Only agents assigned to this organization can draft replies.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft reply</CardTitle>
        <CardDescription>
          The AI writes a first pass. Review and edit it before sending —
          nothing here is sent to the customer automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Tone
          </span>
          <div className="flex flex-wrap gap-2">
            {DRAFT_TONES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTone(option)}
                disabled={isLoading}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  tone === option
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="border-destructive/30 bg-destructive/10 flex items-start gap-3 rounded-sm border p-4">
            <AlertTriangle
              className="text-destructive mt-0.5 size-4 shrink-0"
              strokeWidth={1.5}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Could not draft a reply</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {error.message}. The ticket is unaffected — you can retry, or
                write the reply yourself.
              </p>
            </div>
          </div>
        ) : null}

        {hasDraft || isLoading ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(event) => setEdited(event.target.value)}
              readOnly={isLoading}
              className="min-h-[200px] resize-y"
              aria-label="Drafted reply"
            />
            {isLoading ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                Writing…
              </span>
            ) : (
              <p className="text-muted-foreground text-xs">
                Edited locally. Copy it into your reply when you are happy with
                it.
              </p>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerate} disabled={isLoading} size="sm">
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" strokeWidth={1.5} />
                Drafting…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 size-4" strokeWidth={1.5} />
                {hasDraft ? "Draft again" : "Draft reply"}
              </>
            )}
          </Button>
          {hasDraft && !isLoading ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-1.5 size-4" strokeWidth={1.5} />
                ) : (
                  <Copy className="mr-1.5 size-4" strokeWidth={1.5} />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  setEdited(null);
                }}
              >
                <RefreshCw className="mr-1.5 size-4" strokeWidth={1.5} />
                Clear
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
