# D.E.R.S. Migration Safety

## Status

Production teacher migration was applied on 2026-10-12 after explicit user approval and a full external export outside published assets. Both complete board rows are unchanged, both private backups match, and the two Auth accounts are preserved. Do not reapply this migration. Production frontend release still requires separate approval. The unimplemented 001 migration is superseded.

## Before Applying

1. Run the isolated PostgreSQL and browser tests.
2. Repeat Auth and device tests on a dedicated Supabase staging project. This was completed on ders-staging; tests/staging.cjs uses REAL Auth and REST. Local browser tests separately imitate GoTrue transport.
3. Export quest_board_states with user_id, state, version, updated_at and client_id to a secure location outside published assets. Never commit user exports.
4. Capture row count, quest counts, XP, versions and md5(state::text). Review existing grants and policies.
5. Obtain approval for target project and maintenance window. Apply migrations/20261012_teacher_workflows.sql through the migration tool.

## Preservation

One transaction captures all JSON boards and metadata in ders_private.board_backups. Client access is revoked. Existing boards and Auth users are not rewritten. Before commit, row count, JSON hashes and versions are compared with the backup; any mismatch aborts the transaction.

After commit compare the externally captured counts, hashes, versions and XP. Test live RLS with dedicated accounts. Authorize the frontend production release separately.

## Rollback

A failed migration rolls back automatically. For later issues, stop new teacher writes and revert the frontend. Keep new tables, protection trigger and backups while investigating. Old personal boards remain readable; accepted teacher tasks must remain protected.

Before full backend rollback, export ALL current boards, programs, requests and connections. Review affected boards individually before restoring backups: blanket restoration erases work completed since migration. Only after explicit approval and verified exports may an administrator remove the trigger, public RPC and added schema. Keep backups until restored content is verified. No automatic destructive rollback is provided.

## Security

Roles are chosen once through authenticated RPC and cannot be directly edited. Every cross-user operation checks the current approved connection. Public workflow tables have RLS and SELECT-only client grants. Writes use authenticated operations in a non-exposed schema with empty search_path. Random 96-bit invite codes are hashed, expire, rotate and are rate-limited. A trigger prevents crafted JSON from changing or deleting accepted teacher quests. Completion is unrestricted by day. Revocation immediately denies future teacher reads and rejects pending programs; accepted tasks remain in the student's board.
