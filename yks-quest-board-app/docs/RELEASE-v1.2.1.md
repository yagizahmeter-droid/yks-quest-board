# D.E.R.S. v1.2.1

## Scope and data rules

- Repetition progress and completion use the occurrence ledger for teacher tasks. Final completion is derived from the target; retries cannot create an extra occurrence. Personal repeat metadata retains a single personal task reward at final completion.
- Production's initial read-only audit found 10 repeat tasks and zero flag/ledger mismatches. No corrupt production rows are claimed or bulk rewritten. The checked repair routine restores a projection only if it differs from the immutable ledger; it never inserts occurrence or XP events.
- Pending program requests can be withdrawn. Accepted assignments and individual assigned tasks are soft archived by the sending, still-connected teacher. Existing competitive/personal XP, histories and identities remain.
- Resolved change requests leave the active queue and remain in a separate audit list.
- History cleanup inserts owner-scoped tombstones after a server-computed count/signature confirmation. Raw completions, time segments, tasks and earned XP remain. Visible histories and duration summaries exclude hidden records on both authorized views. Tombstones are cached per account for offline use.
- Calendar days and clipped midnight sessions use Europe/Istanbul. Changing week/day reuses a cached authorized report.
- Natural/Cloud display names change, while stored appearance IDs remain natural/cloud. Classic/Saydam and background/accent preferences remain.

## Migration and rollback

1. Inspect the target before running. Do not rerun an installed migration. The base CLI migration version is 20261027222603.
2. Use scripts/v121-migration.cjs for the guarded release. It takes locks with a five-second timeout and saves an inaccessible, server-side snapshot at ders_release_private.app_snapshots version 1.2.1. Authentication records are fingerprinted, not exported. Existing exam rows are included.
3. The transaction checks every prior table's content (excluding the two new nullable archive columns), old public RLS policies/columns, and unrelated existing functions. An unexpected difference rolls back the whole transaction. _validated must be true.
4. Add only study_history_hidden with read RLS, two nullable archived_at fields, and checked RPC/trigger wrappers. Do not reset boards, accounts, exams or existing policies.
5. A frontend rollback uses the recorded pre-release production commit c2290ff0246d8afc7634a086a91465b1069cdac9. Keep the additive schema and guards installed; do not drop new tables or overwrite later user edits. The old UI lacks archive/cleanup controls; archived-task writes remain blocked by the server. Any data restoration needs a separate scoped review.

## Verification

Relevant automated results are recorded in test-results/v121-*.json and logs. Database security tests use local PostgreSQL and synthetic users. Hosted tests use only hswipswqulolcwqvcjvi and explicitly block production API requests. No real production account is used for destructive or synthetic CRUD tests.

The application is plain JavaScript; scripts/check.cjs checks executable JavaScript syntax and HTML identifiers. There is no TypeScript compilation step. The production build independently verifies the existing Vercel project and live Supabase configuration.
