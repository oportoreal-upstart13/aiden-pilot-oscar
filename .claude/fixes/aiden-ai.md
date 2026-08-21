# @upstart13-com/aiden-ai Fixes

- **[2026-08-21]** `responseSchema` is never sent to Anthropic — structured output is not provider-enforced on that path (plan finding F10)
  - **Symptom**: `ai.complete({ responseSchema })` against `provider: "anthropic"` returns `parsed: undefined` even when the reply is perfectly good JSON. The same call against OpenAI populates `parsed`.
  - **Root cause**: `dist/anthropic.js`'s `toRequest()` builds `{ model, max_tokens, messages, stream, system?, temperature?, tools? }` — `responseSchema` is never placed on the request. The adapter only consults it *afterwards*, at `dist/anthropic.js:214`, to decide whether to attempt `JSON.parse(text)`, and swallows a failure into `parsed = undefined`. The OpenAI adapter does send it, as `response_format: { type: "json_schema", strict: true }`.
  - **Consequence**: any claim of "provider-enforced structured output" is false on Anthropic. The model is never told about the schema at all — only whatever the prompt says.
  - **Fix**: make the guarantee app-level and say so. `src/lib/ai-prompts.ts` states the exact JSON shape in the system prompt, `src/lib/triage.ts` runs at `temperature: 0` and validates the reply with Zod (`TriageResult.safeParse`) before anything is persisted, and every failure path returns `null` so the ticket ships unclassified rather than partially written.
  - **Prevention**: `TRIAGE_JSON_SCHEMA` is authored to satisfy OpenAI strict mode (`additionalProperties: false`, every property in `required`) so one triage implementation serves both providers, and the Zod contract is the single gate regardless of which provider answered.
  - **Upstream**: the Anthropic adapter should either send the schema as a forced tool call (the vendor's supported route to structured output) or document that `responseSchema` is best-effort on that provider.

- **[2026-08-21]** `claude-haiku-4-5` wraps JSON output in a markdown code fence despite an explicit instruction not to
  - **Symptom**: triage logged `triage reply was not JSON; ticket ships unclassified` with `finishReason: "end_turn"` — the call succeeded, the model answered correctly, and the parse still failed. Reproduced by issuing the same prompt directly:

    ```
    RAW>>>```json
    {
      "priority": "medium",
      "category": "technical",
      "sentiment": "neutral"
    }
    ```<<<RAW
    parsed: undefined
    ```

  - **Root cause**: the system prompt says, verbatim, `Reply with a single JSON object and nothing else. No prose, no explanation, no markdown code fence.` The model fences it anyway. Combined with the entry above — the schema never reaches the provider — nothing in the stack forces the format, so `JSON.parse(text.trim())` fails on the leading backticks.
  - **Wrong approach**: relying on the prompt instruction alone, on the reasoning that an explicit prohibition would hold at `temperature: 0`. It does not. A prompt is a request, not a parser contract.
  - **Fix**: `stripCodeFence()` in `src/lib/triage.ts` unwraps a single enclosing fence before `JSON.parse`. This is tolerance for the provider's real output format, not trust in it — Zod validation and the degradation to `null` are unchanged, so a reply that is fenced *and* wrong is still rejected.
  - **Prevention**: treat any model's output format as advisory and parse defensively; keep validation as the only gate. Worth re-checking on a provider switch — the fence habit is model-specific, and the OpenAI path, which does receive `response_format`, does not exhibit it.
  - **Note**: the same probe confirmed usage reporting is real on Anthropic's non-streaming path — `promptTokens: 148`, `completionTokens: 35`, `costUSD: 0.0002584`. The streaming gap (`stream_options: { include_usage: true }` missing from the OpenAI adapter, plan finding F3) is documented when the SSE draft route is built.
