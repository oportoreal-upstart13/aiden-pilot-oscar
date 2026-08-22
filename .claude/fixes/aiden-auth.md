# @upstart13-com/aiden-auth Fixes

- **[2026-08-22]** Sign-in is case-sensitive on the email, and reports the failure as a wrong password
  - **Symptom**: a user cannot sign in and is told the password is incorrect. The password is correct. Reported for `owner@globex.test`, reproduced for every seeded account.
  - **What was ruled out first**: the stored credentials. All nine seeded hashes are `$2b$12$…`, 60 characters, and every one verifies against the documented seed password when compared directly with `bcryptjs.compare` outside the app. All nine also sign in successfully through the API when the email is typed exactly as stored. The database was never the problem.
  - **Reproduction** — same user, same password, only the spelling of the email changes:

    ```
    owner@globex.test    ENTRA
    Owner@globex.test    RECHAZADO
    OWNER@GLOBEX.TEST    RECHAZADO
    owner@globex.test␠   RECHAZADO   (trailing space)
    ```

  - **Root cause**: neither side of the auth flow normalises the address. `credentialsProvider` does `prisma.user.findUnique({ where: { email: parsed.data.email } })` on the raw submitted string, and `createRegisterHandler` does the same for its duplicate check. On a Postgres `text` column that comparison is case-sensitive — `SELECT 'owner@globex.test' = 'Owner@globex.test'` is `false` — so the lookup misses and `authorize` returns `null`.
  - **Why the message misleads**: `authorize` returns `null` for three distinct conditions — the Zod parse failed, no user was found, or the password did not match — and NextAuth collapses all three into one generic credentials error. The user is told the password is wrong when the account was simply never found. That is what makes this expensive to diagnose: the error names the wrong field, so people re-type the password.
  - **Second consequence, worse than the first**: registration has the same gap, so `Owner@example.com` and `owner@example.com` are distinct rows to the unique constraint. Two accounts can exist for one address, and which one you reach depends on how you capitalised it that day.
  - **Fix applied here**: `User.email` is now `citext` (`@db.Citext`), via migration `20260822080000_email_citext`. Fixing the column rather than a call site covers **every** lookup at once — sign-in, registration's duplicate check, and anything written later — and `ALTER COLUMN TYPE` rebuilds `users_email_key` as a case-insensitive unique index, which closes the duplicate-account hazard in the same statement. Verified safe before applying: `SELECT lower(email) FROM users GROUP BY 1 HAVING count(*) > 1` returned zero rows.
  - **Why not patch the call sites**: `credentialsProvider` is a package primitive. Normalising only registration would lock out anyone already registered with capitals; normalising only sign-in would break anyone who registered with them. The two have to change together, which is an upstream change — and a column that enforces the intended semantics needs neither.
  - **Verified after the change**: `owner@globex.test`, `Owner@globex.test`, `OWNER@GLOBEX.TEST` and `OwNeR@GloBex.TeSt` all resolve to the same account, as do capitalised spellings of four other personas. Negative controls still reject — wrong password, wrong password with a capitalised email, unknown user, and unknown user capitalised. Both suites unchanged: 40/40 tests, 16/16 probes.
  - **Not fixed by this**: leading or trailing whitespace. `"owner@globex.test "` still fails, though it fails at Zod's email validation rather than at the lookup. Browsers trim `<input type="email">` on submit, so it is unlikely through the UI, but a client posting the API directly can still hit it.
  - **Prevention (upstream)**: normalise with `email.trim().toLowerCase()` in both `credentialsProvider` and `createRegisterHandler`, and distinguish "no such user" from "bad password" in what `authorize` reports internally — even if the response to the client stays deliberately generic, the server log should not be. An SDK that owns both the write and the read of an identifier owns its normalisation.
