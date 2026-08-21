"use client";

import { useState } from "react";
import { useAIStream } from "@upstart13-com/aiden-realtime/react";
import { PageHeader } from "@upstart13-com/aiden-ui";
import { Button } from "@upstart13-com/aiden-ui/components/button";
import { Textarea } from "@upstart13-com/aiden-ui/components/textarea";

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const { text, isLoading, error, send, reset } = useAIStream<{
    prompt: string;
  }>("/api/ai/chat");

  const onSend = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    await send({ prompt: trimmed });
  };

  return (
    <div>
      <PageHeader
        title="Chat"
        subtitle="Streams over Server-Sent Events via @upstart13-com/aiden-realtime."
      />

      <div className="max-w-3xl space-y-8 px-6 py-8">
        <section className="border-border bg-card min-h-[240px] rounded-xl border p-6">
          {text.length === 0 && !isLoading && !error && (
            <p className="text-muted-foreground text-sm italic">
              Send a prompt to see streamed output here.
            </p>
          )}
          {text.length > 0 && (
            <pre className="text-sm whitespace-pre-wrap">{text}</pre>
          )}
          {error && (
            <p role="alert" className="text-destructive mt-4 text-sm">
              {error.message}
            </p>
          )}
        </section>

        <div className="space-y-2">
          <Textarea
            placeholder="Ask anything…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button onClick={onSend} disabled={isLoading || !prompt.trim()}>
              {isLoading ? "Streaming…" : "Send"}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={isLoading}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
