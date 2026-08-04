# `aiden doctor` / `aiden upgrade --dry-run` output

## What happened

Both commands fail identically, before ever reaching their real checks:

```
$ npx @upstart13-com/aiden-cli doctor
aiden doctor

1. aiden.config
   ✗ aiden-cli: failed to parse aiden.config.ts literal: Bad control character in string literal in JSON at position 369 (line 13 column 19)

exit code: 2
```

```
$ npx @upstart13-com/aiden-cli upgrade --dry-run
aiden upgrade (dry-run)

Error: aiden-cli: failed to parse aiden.config.ts literal: Bad control character in string literal in JSON at position 369 (line 13 column 19)
    at parseTsConfigLiteral (.../aiden-cli/dist/cli.js:94:11)
    at readConfig (.../aiden-cli/dist/cli.js:77:10)
    at loadAidenConfig (.../aiden-cli/dist/cli.js:54:23)
    at upgrade (.../aiden-cli/dist/cli.js:970:28)
    ...
exit code: 1
```

## Root cause (diagnosed, not guessed)

Both commands load `aiden.config.ts` through `parseTsConfigLiteral` in `aiden-cli@2.0.1` (the latest published version — this isn't a stale-install issue). That function strips comments with `source.replace(/\/\/.*$/gm, "")` before JSON-parsing the object literal. That regex matches `//` **anywhere on a line**, including inside a string value — it has no concept of string boundaries. `app.url: "https://example.com"` — which is the *stock scaffold's own default placeholder value*, unmodified — gets truncated mid-string to `"https:`, producing invalid JSON that `JSON.parse` rejects with exactly the "Bad control character" error above (an unterminated string swallows the following newline as a literal control character).

Reproduced directly by running the CLI's own transform against the file outside the CLI (see `.claude/fixes/aiden-cli.md` for the full trace): any `aiden.config.ts` containing an `http://` or `https://` string anywhere — which is every realistic one, since `app.url` ships with an `https://` placeholder — hits this. It is not specific to anything changed in this app.

## Why I didn't "fix" it by editing `aiden.config.ts`

The only way to make the buggy parser succeed is to remove the `//` from `app.url`, which means making it not a real URL. That trades a correct config value for a green checkmark from a tool bug — the checkmark would be fake, and the config would be wrong. Filed as `.claude/fixes/aiden-cli.md`, with a note that the real fix belongs upstream in `aiden-cli`.

## What I verified manually instead

`doctor`'s env-var check (`requiredEnvVars` in `cli.js`) is straightforward enough to read and apply by hand without running the buggy parser. For this config (`auth.providers.credentials: true` only, `ai.providers.anthropic` enabled, billing/email disabled), the required set is:

| Variable | Reason | Present in `.env.local`? |
|---|---|---|
| `DATABASE_URL` | Prisma datasource | Yes |
| `AUTH_SECRET` | NextAuth session signing | Yes |
| `ANTHROPIC_API_KEY` | Anthropic provider | Yes |

No OAuth provider env vars are required (only `credentials` is enabled). All three required variables are set — the app runs and the AI draft/classify calls succeed live (verified separately via the smoke suite and manual draft/classify calls), which is the actual thing `doctor`'s env check exists to confirm. The CLI bug blocks the tool's own report, not the app's correctness.
