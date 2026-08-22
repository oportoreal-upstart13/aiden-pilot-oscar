# DeskLine — self-assessment

> **The rubric this was supposed to be written against is not in this
> repository.** The plan calls for "the Module 12 readiness bars", ten of them.
> A search of `docs/`, `.claude/` and `CLAUDE.md` turns up exactly one surviving
> reference to the whole scheme — the words "Capability E" in
> `docs/plans/deskline.md:603` — and no list of bars, no capability letters, no
> criteria text.
>
> Writing ten headings from memory and grading against them would be inventing
> the standard I am being measured by, which is worse than any partial mark. So
> this document is organised around the plan's own dimensions and the
> capabilities the plan names, each with a pointer to a real artefact. When the
> ten bars are supplied, mapping these rows onto them is mechanical.
>
> Every row is **Met**, **Partial** or **Not met**, and a row marked Met without
> a pointer you can open is treated here as Not met.

Assessed 2026-08-22 against the state at commit `429a4a6` plus the phase 9
working tree.

---

## Summary

| | Count |
|---|---|
| Met, with evidence | 16 |
| Partial | 4 |
| Not met | 1 |

The four partials and the one gap are each named below with what is missing.
None is hidden in prose.

---

## Data and schema

| Bar | Status | Evidence |
|-----|--------|----------|
| Models authored as fragments, `schema.prisma` never hand-edited | **Met** | `prisma/fragments/{org,membership,ticket,aiusage,user}.prisma`; the composed schema carries the generated-file banner. `npm run prisma:merge` is wired into `build`, `db:migrate` and `prisma:generate`. |
| Migrations applied and coherent | **Met** | Two migrations, `20260821153555_deskline_core` and `20260821180000_deskline_audit_org_index`. `prisma migrate status` → "Database schema is up to date". |
| Seed is idempotent | **Met** | Run twice consecutively with identical counts: 2 orgs, 9 users, 10 memberships, 12 tickets, 2 roles, 3 permissions. `docs/evidence/suites-2026-08-22-green.txt`. |
| The audit expression index is used, not merely created | **Partial** | Predicate A resolves to an **Index Cond** on `audit_logs_metadata_org_id_idx` — but only with `enable_seqscan off`, because at 12 rows a sequential scan is genuinely cheaper. Predicate B does **not** use the actor index at all; the planner walks the timestamp index and filters. Both facts captured, neither smoothed over. `docs/evidence/audit-index-2026-08-21.txt`, deviation D7. |

## Request perimeter and tenant isolation

| Bar | Status | Evidence |
|-----|--------|----------|
| Every route authenticates before any data access | **Met** | All 12 handlers read for call order; one deliberate exception, `/api/auth/register`, which is public by necessity and rate-limited to 5/min per IP. `docs/evidence/security-review-2026-08-22.md`. |
| Bodies and query strings validated with Zod | **Met** | No route calls `request.json()` directly. `parseRequest` for bodies, `parseQuery` for search params, both raising the same `RequestValidationError` → 400. |
| Cross-tenant access is indistinguishable from nonexistent | **Met** | Probes 3 and 5 compare three 404 bodies **byte for byte** — cross-tenant, not-yours and missing all return `{"error":"Resource not found"}`. `docs/evidence/verify-against-plan-2026-08-22.txt`. |
| A forged tenant cookie grants nothing | **Met** | Probe 7: an Acme session sending `deskline_org=org_globex` still gets `activeOrgId: org_acme` and zero Globex rows. |
| No unvalidated identifier reaches a query | **Partial** | The adapter Zod-validates resolved params before the handler runs, and the bound is exercised over HTTP. But the specific case the guard exists for — `withAuth`'s `ctx?.params ?? {}` yielding an `undefined` id — is **unreachable over HTTP**, because Next always supplies params, and cannot be reached in-process either. Covered by code review and deviation D4, not by a test. Reasons in `.claude/fixes/testing.md`. |

## Permissions

| Bar | Status | Evidence |
|-----|--------|----------|
| The simplest primitive that fits, justified | **Met** | Three flat org roles as `AbilityPredicate`s over the active membership. Four alternatives rejected in writing in Dimension 4, including mirroring the org role into the JWT. |
| Role behaviour enforced server-side, not by hidden UI | **Met** | Probe 6 and the route tests: viewer reads a ticket (200) and is refused the AI action (403); owner reads every ticket and is refused mutation (403). The UI hiding a control is sugar over a server that answers 403 regardless. |
| Denials are audited | **Met** | `security.ability_denied` ×7 and `security.ownership_failed` ×26 in `audit_logs`, auto-emitted by the SDK and relied on rather than re-implemented. |

## AI

| Bar | Status | Evidence |
|-----|--------|----------|
| One streaming feature, via the SDK | **Met** | `POST /api/tickets/[id]/draft` uses `createAIStreamResponse` from `aiden-realtime` server-side and `useAIStream` client-side. No hand-rolled SSE encoder, no raw `fetch` to a provider. |
| One structured-output use, with an honest guarantee | **Met** | Triage. The guarantee is app-level and stated as such, because the schema reaches the provider on OpenAI, not at all on Anthropic, and as JSON-mode-without-schema on Groq. Zod is the only gate that holds across the three. `.claude/fixes/aiden-ai.md`. |
| AI is an enhancement, never a gate | **Met** | Verified against three distinct failure modes, not one: a fenced reply, an unsent schema, and a hard 401. Every time the ticket was still created, the request still returned 201, and the failure was logged as metadata only. |
| Provider switch is one config line, zero route edits | **Met** | `git diff --name-only` after the switch lists exactly `aiden.config.ts`. Both providers exercised on both AI paths. `docs/evidence/provider-switch-2026-08-22.txt`. |
| Prompt injection contained | **Met** | The criterion is that content is fenced and that the probe neither leaks nor echoes, and both were verified. Ticket content is fenced inside the user message, never concatenated into the system prompt, and the delimiters are stripped from the content so a crafted body cannot close the fence early — asserted structurally in `src/lib/ai-prompts.test.ts`, not only observed. Against the seeded hostile ticket the model obeyed nothing and echoed nothing: zero hits on eight patterns, four of them distinctive phrases from the system prompt so a paraphrased leak would also have been caught. `docs/evidence/injection-probe-2026-08-21.txt`.<br><br>**Scope of the claim:** that is one payload, one model, one date. A prompt is a request, not enforcement — the same model ignores an explicit "no markdown code fence" instruction in the triage prompt. What holds without the model's cooperation is the fencing, the delimiter stripping, a route with no tools and no data access, a prompt that can only ever contain a ticket the caller was already authorised to read, and a human who edits the draft before anything reaches a customer. Re-run the probe on any provider or model change. |
| Cost telemetry is real, not estimated | **Met** | 6 `AIUsage` rows, both providers, both routes, all provider-reported. The `route` and `orgId` the SDK does not supply come from the app's own correlation map (F5). |

## Audit

| Bar | Status | Evidence |
|-----|--------|----------|
| Every domain event fires with the specified shape | **Met** | All 7 planned events present, metadata keys compared with `jsonb_object_keys` rather than by eye. Worth stating: `ticket.update` and `ticket.close` had **never fired** until the verification run went looking — the ritual found a real gap. |
| The audit viewer is tenant-scoped | **Met** | Rewritten in both places it leaked — the API route and the page — now sharing one `listOrgAuditEntries`. Probe 10 asserts by id that no Globex-exclusive actor appears. |
| Sink swappability demonstrated | **Met** | `src/lib/audit-sinks.ts` ships an NDJSON file sink; one flag in `aiden.config.ts` chooses it, and `git diff --name-only` after the flip lists only that config file. Demonstrated in both directions: with the flag on `"file"`, three events landed in `logs/audit.ndjson` and `audit_logs` stayed at 117 rows, with absence proved by querying the new ticket's `resource_id` (0 rows) rather than inferred from an unchanged total; reverted, the table went to 120 and the file stopped growing. `docs/evidence/audit-sink-swap-2026-08-22.txt`. |
| Retention position stated | **Met** | Dimension 6: no retention policy ships because the database is disposable; in a real deployment retention lives downstream of the sink, never inside `aiden-security`. |

## Process and craft

| Bar | Status | Evidence |
|-----|--------|----------|
| Plan approved before the first feature commit | **Met** | `6febbb1` (plan) precedes `c284645` (first feature commit) on `certification`, whose history starts at the untouched scaffold. |
| UI pre-flight performed before any `.tsx` | **Met** | Commit `ee0763d`, 2026-08-21 15:44:07, one file, zero `.tsx` touched. Eight of nine DS files read, and the reading surfaced three conflicts before any UI existed. |
| Deviations recorded, none silently absorbed | **Met** | D1–D11 in the plan header, each with a date and root cause. Eleven files landed outside the plan's list and all eleven are accounted for. |
| Build verified against the plan, not memory | **Met** | The results table at the end of `docs/plans/deskline.md`, dimension by dimension. It found two things memory would not have: two events that had never fired, and two smoke probes that had been passing while testing nothing. |
| Mutation paths covered by the suites | **Partial — declared coverage gap** | Neither suite exercises a **successful mutation**. Every mutation assertion is a *denial*: probe 4 PATCHes a colleague's ticket and expects 404, probe 6 expects 403 on draft, the route tests PATCH as an owner and expect 403. Nothing asserts that a legitimate PATCH or close by the owning agent succeeds and does the right thing. The consequence surfaced during verification: `ticket.update` and `ticket.close` had **never fired once** in the entire build, and exist in `audit_logs` only because they were triggered by hand on `tkt_acme_2` during the verify-against-plan run. So the happy path is *observed*, once, manually — not *covered*. Two probes asserting a successful update and a successful close, each checking the audit row it emits, would close this; they are not written. |
| Security review clean | **Met** | PASS. One HIGH found and resolved inside the review — full Prisma models in the create responses. `docs/evidence/security-review-2026-08-22.md`. |
| Upgrade path exercised | **Partial** | `--dry-run` was run and produced a **finding, not a result**: the CLI cannot spawn `npm` on Windows and misreports it as a registry failure. Root cause isolated in the bundle and reproduced three ways. What could not be demonstrated is an actual upgrade, because there is nothing to upgrade to — all six packages publish and are installed at 2.0.1. `docs/ops-diagnosis.md` §3. |
| Screenshot evidence of the seeded state | **Not met** | No browser-automation tool in this environment, so Prisma Studio cannot be captured here. Owed as a manual capture. The equivalent data — both orgs, all 10 memberships with Iris twice at different roles, all 12 tickets, the injection body in full — is in `docs/evidence/seed-state-2026-08-22.txt`. |

---

## What I would fix first, in order

1. **Two probes for the mutation happy path** — a successful PATCH and a
   successful close by the owning agent, each asserting the audit row it
   emits. Cheapest item on this list and it closes the only gap where the
   suites are silent about code that runs in production. Half an hour.
2. **The Prisma Studio capture.** Blocked only on tooling, not on work.
3. **Predicate B's index.** A composite `(actor_id, timestamp)` would make the
   audit viewer's cost scale with the organization rather than the table. The
   phase instruction was not to add an index, so it was not added; the
   consequence is recorded instead.
4. **The unreachable params case.** It stays unreachable until a test framework
   is installable, which needs the registry question resolved.

## What I would not change

The remaining partials are partial because of what the evidence can honestly
support, not because work is missing.

The injection row is now Met, and the distinction matters: the criterion is
that content is fenced and that the probe neither leaks nor echoes, and both
were verified — structurally in a test for the fencing, empirically for the
behaviour. What cannot be certified is the model's future behaviour, and that
belongs in the scope note, not in the grade. Marking it Partial was conflating
"this is not a permanent guarantee" with "this was not achieved", which would
have understated the work as badly as an unevidenced Met would have overstated
it.

The upgrade row stays Partial for the opposite reason: what was produced there
is a finding, not a demonstration, and no amount of framing turns a CLI that
cannot run on this platform into an exercised upgrade path.
