# @upstart13-com/aiden-cli Fixes

- **[2026-08-22]** `aiden doctor` reports a required environment variable as satisfied when it is merely present — not when it is valid, and not when it belongs to the provider it was declared for
  - **Symptom**: a completely green doctor over a configuration that could not make a single AI call.

    ```
    2. Environment variables
       ✓ all 4 required vars present
    …
    All checks passed.
    ```

    The same configuration, one build later, on the first request that touched the provider:

    ```
    level 50  msg "triage call failed; ticket ships unclassified"
    err.status 401
    err.message 401 {"error":{"message":"Invalid API Key",
                "type":"invalid_request_error","code":"invalid_api_key"}}
      at eI.makeStatusError (… node_modules_groq-sdk_index_mjs …)
    ```

  - **Root cause**: with `ai.providers.groq: true`, doctor adds `GROQ_API_KEY` to the required set and then checks only that it is non-empty. The value configured was 84 characters with the prefix `xai-` — a well-formed key **for xAI**, the company behind the Grok models, rather than for **Groq**, the inference provider whose keys come from console.groq.com and begin with `gsk_`. Two different vendors one letter apart. Doctor has no notion of which provider a key belongs to, so a real key for the wrong service is indistinguishable from a correct one.
  - **Why this matters more than it looks**: the check exists to stop a deployment going out with a missing credential. A deployment that goes out with a *wrong* credential fails identically from the user's side, and doctor is the step that was supposed to catch it. The failure mode it does not cover is the one most likely to happen in practice — nobody pastes an empty string, people paste the wrong key.
  - **Fix (consumer side)**: do not treat a green doctor as a working integration. Rehearse every provider switch against a real request before recording it as evidence, which is how this was caught: the switch to Groq was rehearsed, the ticket came back unclassified, and the 401 was in the log.
  - **Prevention (upstream)**: two cheap improvements, in order of value. (1) Validate the *shape* of provider keys where the vendor publishes a stable prefix — `gsk_` for Groq, `sk-ant-` for Anthropic, `sk-` for OpenAI — and warn on a mismatch rather than passing silently. (2) Offer an opt-in liveness probe (`aiden doctor --verify-keys`) that issues one minimal authenticated request per enabled provider. Presence is worth checking; it just should not be reported in language that implies more than it verified. "all 4 required vars present" is accurate; "All checks passed" alongside it is what misleads.
  - **Related**: the degradation path held throughout — the ticket was still created, the request still returned 201, the failure was logged with status and message and no ticket content, and no `ai_usage` row was written because the SDK threw before `reportUsage`. Full capture in `docs/evidence/groq-switch-rehearsal-2026-08-22.txt`.

- **[2026-08-22]** `aiden upgrade` cannot run on Windows: it spawns `npm` without `shell: true`, then blames the registry
  - **Symptom**: `npx @upstart13-com/aiden-cli upgrade --dry-run` prints `Current version: 2.0.1` and then `✗ Could not resolve latest version from registry.`, exit 1 — on a machine where the registry is reachable and authenticated.
  - **Root cause**: `fetchLatestVersion` in `dist/cli.js` is `spawnSync("npm", ["view", pkg, "version"], { encoding: "utf8" })`, with no `shell: true`. On Windows `npm` is `npm.cmd`, and since Node 18.20 / 20.12 spawning a `.cmd` without a shell is blocked as hardening against CVE-2024-27980. The call returns `{ status: null, error: "ENOENT" }`, the guard `if (r.status !== 0) return null` fires, and the caller reports a registry failure for what was a process-spawn failure. npm is never launched.
  - **Reproduced three ways** on Node v22.22.3, same machine, same package the CLI queries (`AIDEN_PACKAGES[0]` = `@upstart13-com/aiden-ai`): from the shell → `2.0.1`; via `spawnSync` without a shell → `ENOENT`; via `spawnSync` with `shell: true` → `2.0.1`.
  - **Wrong diagnosis to avoid**: the message points at the registry, and this repository genuinely has no project-level `.npmrc` and no `GITHUB_PAT`, so "private registry auth" is the obvious and incorrect conclusion. It is wrong — a user-level `~/.npmrc` supplies the credentials and `npm view` resolves every scoped package. Check `npm view <pkg> version` by hand before believing the message.
  - **Fix (upstream)**: pass `shell: true`, or resolve `npm.cmd` on `process.platform === "win32"`, or drop the subprocess and query the registry over HTTP. Also worth separating the two failure modes in the message — "could not run npm" and "registry did not answer" are different problems with different remedies.
  - **Consequence here**: `aiden upgrade` is unusable from Windows, and `CLAUDE.md` forbids hand-editing `@upstart13-com` versions because the CLI also runs codemods and migrations. There is nothing to upgrade today — all six packages publish and resolve at 2.0.1, matching what is installed — but the escape hatch is unavailable when there is. Full capture in `docs/evidence/upgrade-dryrun-2026-08-22.txt`.

- **[2026-08-21]** `npx aiden` resolves to an unrelated third-party package, not the Upstart13 CLI
  - **Symptom**: `CLAUDE.md` documents `npx aiden doctor` and `npx aiden upgrade`. Neither does what the documentation says.
  - **Root cause**: there is no `aiden` binary in `node_modules/.bin` — only `aiden-db-merge-schema`. The unscoped name `aiden` on the public npm registry is a different project entirely: `aiden@0.0.3`, "AI-powered CLI tool for development assistance", by Evgenij Beloded, `github.com/ebeloded/aiden`, MIT, depending on `@ai-sdk/*` and `ai@^4`. It was already sitting in this machine's npx cache at `…/npm-cache/_npx/4fe3629aa9474dc9/node_modules/aiden`, meaning it had been downloaded and executed here at least once.
  - **Fix**: use the scoped name — `npx @upstart13-com/aiden-cli doctor`, `npx @upstart13-com/aiden-cli upgrade`. The `@upstart13-com` scope resolves from GitHub Packages per `.npmrc.example`.
  - **Prevention**: correct `CLAUDE.md` to the scoped command. An unscoped package name in documentation is a supply-chain invitation: the reader runs it, npm silently fetches whatever currently occupies that name on the public registry, and it executes.

- **[2026-08-21]** `aiden doctor` cannot parse the `aiden.config.ts` that `aiden init` produces
  - **Symptom**: `failed to parse aiden.config.ts literal: Bad control character in string literal in JSON`, on an untouched scaffold.
  - **Observations**: the shipped literal contains `url: "https://example.com"` — a `//` inside a string value. The same content with LF endings parses; with CRLF endings on Windows it does not. A config with no `//` inside any string value parses under CRLF. **The exact mechanism was not isolated**; the error text points at a raw CR or LF surviving inside a quoted JSON string, consistent with a line-based comment stripper truncating `"https:` mid-string, but that was not confirmed.
  - **Fix**: this build's config keeps `//` out of every string value (`url: "deskline.example.com"`), which parses under CRLF.
  - **Prevention**: a `.gitattributes` pinning `eol=lf` addresses the line-ending half. It is hygiene, not the fix — the config in this repository is CRLF and parses. Removing the `//` is what made it work. Upstream, the config reader should parse the literal with a real parser rather than stripping comments with a regex.
