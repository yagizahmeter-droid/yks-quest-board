# v1.5.0 database safety

## M1

Target for development: `hswipswqulolcwqvcjvi` only. Production `jswgagzbetwviamiwcck` is not authorized for migration or deployment.

Preflight: class tables and RLS exist; private `action`, `detail`, `stats` functions are the v1.3.0 definitions plus the original privacy/history fixes. Sharing defaults are already false. Cron is available but not enabled; M1 does not enable it.

Run the output of `scripts/v150-migration.cjs` as one transaction. It saves application rows and previous function definitions to the existing server-only `ders_release_private.app_snapshots` table. Only a validation flag leaves that storage. Existing public/auth rows and all existing public policies are fingerprinted before and after, with any difference aborting the entire migration. No backups are exported to local files.

M1 adds private membership and connection periods with RLS and no client grants. Backfill retains only known intervals. Previously overwritten join/connection periods cannot be reconstructed; the code conservatively excludes unknown history. The class history and individual teacher history are still stored in their original tables.

Current class statistics use the current membership period intersected with recorded approved connection periods. A leave/rejoin starts fresh class statistics; existing class XP is not rewritten. Revoking the connection denies access immediately. Classmates' aggregates contain only consenting eligible contributors and need three contributors. Granular peer time-series and subject buckets are suppressed to prevent sparse-bucket differencing. Individual explicitly shared profile data still follows its separate name/exam/study consents.

## Recovery

If a preservation check fails, the transaction rolls back automatically. For a functional rollback after successful staging application: first revert the application commit, stop any v1.5.0 test activity, and inspect the snapshot's `_functions`. In a reviewed transaction restore the saved v1.3.0 `action`, `detail` and `stats` definitions and grants, remove the two period tracking triggers, and keep new private period tables and the snapshot for audit. Never restore old snapshots over newer user records. Do not copy staging data to production. No production recovery action has been executed.

Later milestones must add their own preflight, snapshot and verification evidence before staging application. Production requires separate approval after the complete preview is reviewed.

## M2

The `v150_m2_class_sections_guarded` transaction captures a separate `1.5.0-M2` closed snapshot, verifies M1 exists, and refuses repeat installation. Existing rows and public policies are checked before/after. Only new scoped read helpers and two ordered-page indexes are added; the authenticated dispatcher keeps its backwards-compatible path. No existing index is removed.

The benchmark helper in `tests/v150-staging-benchmark.sql` is staging-only and is not a production migration or build asset. It accepts only predefined sizes and an existing synthetic teacher, denies all client execution, and rolls back generated accounts/programs/memberships before returning aggregate timings/plans. The preservation check and independent zero-fixture count passed.

Code rollback can continue using the backwards-compatible detail API; no user rows need restoring. Any function rollback must preserve the M1 consent/membership safeguards and use the saved definitions under review. New read helpers/indexes can remain inert during a code rollback. Never overwrite newer application data with release snapshots.

## M3–M7 (local verification; not yet applied remotely)

`scripts/v150-workspace-migration.cjs` produces one transaction per milestone with schema preflight, a server-only closed snapshot, original table/policy fingerprints and abort-on-difference verification. The original table catalog is fixed before adding tables. Backups also retain application function definitions, owners and ACLs for a reviewed function rollback. No raw user export is written to disk.

- M3 adds owner/linked-student drafts with server-enforced revisions; no direct client mutation grant.
- M4 adds teacher-owned templates, dispatches and per-recipient receipts; original assignment/completion/XP functions remain canonical. Reminders respect preference and a server cooldown.
- M5 adds teacher-only read helpers and a shared date validator. Existing user rows and RLS policies are unchanged. Historical membership/connection scope and missing/partial exam distinctions are preserved.
- M6 adds teacher-owned schedules and a private worker. Cron owns one named job; no client may execute the worker or mutate schedule rows directly. Delivery rechecks both current authorization and the saved membership/connection period. Retries reuse original receipts. Cancellation/edit and delivery serialize on the schedule row. Existing tasks/XP are never reset.
- M7 adds a teacher-only actionable summary and three missing FK indexes for new workspace/interval relations; existing user rows, old indexes and old public RLS policies are preserved.

Before a functional rollback, stop **only** `ders-v150-program-dispatch` in Cron and leave its jobs/receipts for audit. Revert the application commit, then review saved function definitions/ACLs and restore compatible dispatchers. Do not drop tables, delete user records or restore older row snapshots over newer data. An already-sent assignment is not undone by cancelling pending recipients. No production rollback or activation has been executed.

Local scheduler testing uses a registration fixture and calls the real PostgreSQL worker on independent connections without a browser. It verifies locking, partial retry, revoked connections, rejoined membership, class archive and cancellation races. It does **not** establish that native pg_cron runs in staging; native activation and a real timed delivery still gate completion.

## Native staging installation verified

The atomic `v150_m3_m7_guarded_staging_bundle` was applied on 16 November to staging only. All M1–M7 `_validated` flags are true. Native pg_cron 1.6.4 owns only the named once-per-minute workspace job. Eight real Auth/RLS/UI/Cron groups passed; automatic browser-closed delivery produced one attempt and two sent receipts. Anonymous/authenticated worker EXECUTE is false. The earlier local-only scheduling limitation is superseded by this evidence; detailed concurrency/failure injection still runs on isolated local PostgreSQL. No production migration was applied. The prepared install bundle is now a historical reviewed input, not a command to rerun on the installed schema.
