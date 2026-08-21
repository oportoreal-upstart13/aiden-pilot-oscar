-- Expression index for the audit viewer's organization predicate.
--
-- The AuditLog model itself is NOT touched: it belongs to the fragment
-- aiden-db ships, and adding a database index is not redefining it.
--
-- The expression must match the one Prisma actually emits. A filter
-- written as `metadata: { path: ["orgId"], equals: x }` compiles to
--
--   ("audit_logs"."metadata" #> ARRAY[$1]::text[])::jsonb::jsonb = $2
--
-- captured from Prisma 7.9.1 query logging — note `#>`, not `->>` and
-- not `#>>`. Postgres elides the redundant ::jsonb casts and folds the
-- array constructor, so the planner sees
--
--   (metadata #> '{orgId}'::text[])
--
-- which is what this index is built on. Postgres matches functional
-- indexes by expression equivalence, so an index on any other operator
-- would be created and never used.
--
-- No index is added for actorId: the shipped fragment already declares
-- @@index([actorId]), which Postgres created as audit_logs_actor_id_idx.

CREATE INDEX "audit_logs_metadata_org_id_idx"
  ON "audit_logs" ((metadata #> '{orgId}'::text[]));
