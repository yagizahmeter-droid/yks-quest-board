# v1.2.0 - Deneme Takip Sistemi

## Scope
- TYT: Turkish 40, social 20 (5/5/5/5), math 40, science 20 (7/7/6).
- AYT: selectable math 40, science 40 (14/13/13), literature/social-1 40 (24/10/6), social-2 40 (11/11/12/6).
- No geometry questions added on top of math. No KPSS/YDT, AI or rankings.
- One account-owned exam row contains metadata and validated test results. No board JSON, XP or task-history writes.
- Missing counts are null, not zero. Net requires correct and wrong. Complete tests require all three counts and exact capacity.
- Main TYT test totals and subtests are mutually exclusive. AYT groups are selected explicitly.
- Total statistics compare only complete exams with identical selected group coverage. Partial points are marked and not joined to the complete-exam trend.

## Access and Concurrency
- New practice_exams table has RLS enabled and four owner/read policies.
- Reuses the existing approved-link check for teacher SELECT. Teachers cannot mutate results.
- New public RPC is SECURITY INVOKER, not a privileged bypass. No service-role keys.
- Trigger independently validates counts and derives net, maximum and completeness.
- Save uses client UUID, advisory transaction lock and revision checks. Retried identical saves are idempotent.
- Auth changes clear private caches and form contents. Teacher tab changes unmount pending views.
- No Realtime subscriptions or polling were added. Lists are cached per account and refreshed on navigation, return or explicit refresh.
- Offline saves show an error without clearing the active form. Exam data is not placed in the service-worker cache.

## Migration and Recovery
- Migration: supabase/migrations/20261027175752_practice_exams_v120.sql.
- Deploy with scripts/v120-migration.cjs: server-only snapshot in ders_release_private.app_snapshots, version 1.2.0.
- Locks and before/after fingerprints verify existing rows, accounts, policies, grants, columns and old functions. Any difference rolls back the transaction.
- Only the new exam table, index, validation trigger, private schema and invoker RPC are added.
- The Supabase connector mutation endpoint returned an expired-request-state error. The SQL editor fallback uses its RLS-enabled execution option, followed by independent schema and fingerprint checks.
- Record an applied SQL-editor migration in supabase_migrations.schema_migrations only after the validated snapshot and schema exist.
- Rollback UI to d63d834a6a978fc888fbcc5a5522732488197202; retain exam tables and records. Do not drop data as a rollback.

## Verification
- tests/exams.cjs: calculation, count/date validation, partial input, selected AYT tests, same-day order, comparable statistics.
- tests/exams-db.cjs through tests/integration.cjs: migration preservation, server validation, ownership, RLS, teacher read-only, revocation, retries and conflicts.
- tests/exams-browser.cjs: actual form actions, edits/deletes, graph updates, failed save/retry, independent device, teacher tab, logout.
- Browser matrix: 360/390/430/768/1440 px, all four styles, light/dark.
- tests/exams-staging.cjs runs only on isolated hswipswqulolcwqvcjvi, blocks production API requests and cleans only newly created synthetic exam rows.
- JavaScript syntax checks and production artifact checks apply. This plain-JavaScript repository has no TypeScript compilation target.
- Production config remains jswgagzbetwviamiwcck. No real-user write tests are permitted on production.
