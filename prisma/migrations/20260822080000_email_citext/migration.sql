-- Make User.email case-insensitive.
--
-- `credentialsProvider` and `createRegisterHandler` in aiden-auth both do
-- `findUnique({ where: { email } })` against the raw submitted string and
-- neither normalises case or whitespace. On a `text` column that makes
-- sign-in case-sensitive: `Owner@globex.test` does not match the stored
-- `owner@globex.test`, `authorize` returns null, and NextAuth reports the
-- same generic error it uses for a wrong password — so the user is told
-- the password is wrong when the account was simply not found.
--
-- The same gap lets registration create two accounts that differ only in
-- capitalisation, because the unique constraint treats them as distinct.
--
-- Changing the column type fixes every lookup at once instead of one call
-- site, and rebuilds the unique index as case-insensitive so the
-- duplicate-account hazard closes with it.
--
-- Safe to apply here: `SELECT lower(email) FROM users GROUP BY 1 HAVING
-- count(*) > 1` returns zero rows, so no existing pair collides under the
-- new semantics.

CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "users" ALTER COLUMN "email" TYPE citext;
