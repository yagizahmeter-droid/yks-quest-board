# D.E.R.S. v1.1 - Teacher Experience & Quest System Update

## Scope and isolation

Development branch: `ders-teacher-quests-update`, based on released
`4f298414a1e2a95c53996644e4e3fe037e596213`. No production release is authorized.
Production remains the existing Vercel project `prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T`
and Supabase `jswgagzbetwviamiwcck`. Only the existing isolated staging project
`hswipswqulolcwqvcjvi` is used for hosted write tests. Never point test scripts at production.

## Components

- `teacher.js`: student cards, student-specific draft, exam/lesson/topic builder,
  progress, pending withdrawal and results placeholder. Account initialization is unchanged.
- `curriculum.js`: curated starting topics and exam-specific lessons, manual topic fallback.
- `quest-system.js`: Istanbul calendar, per-user offline outbox, per-occurrence rewards.
- `select-controls.js`, `quest-ui.css`: joined searchable combobox/listbox and scoped layouts.
- `sync.js`, `index.html`, `ui.js`: canonical repeat merge, occurrence-aware XP/history,
  non-destructive week archival. Old one-time tasks retain their old completion behavior.
- `manifest.webmanifest`, `icons/ders-*-v2.*`, `service-worker.js`: static approved D logo.
  Service-worker changes remove only this app's old shell caches, never localStorage,
  Auth/session storage, the pending outbox or user boards.
- `migrations/20261014_teacher_quest_repeats.sql`: additive schema and protected RPC operations.

## Data and security

Migration is transactional. It takes a private, RLS-protected snapshot of boards,
profiles, connections, assignments, quests, requests, invitations and the original
RPC definition. It compares old board hashes and versions before commit; a mismatch
aborts everything. No seed/reset/delete or modification of legacy board JSON occurs.
Auth accounts are not modified. Existing pending and accepted programs remain valid.

New completion events are append-only for clients. Only the authenticated RPC can
create them. Unique keys protect request retries, weekly occurrence indices and daily
Istanbul dates. Per-student transactional locks serialize completions and teacher edits.
No client clock or client-supplied XP is trusted. Accepted/withdrawn status transitions
share an assignment-row lock. Revocation immediately removes teacher read access.
All internal helper functions are private; legacy RPC execution is revoked to prevent bypass.

Week removal archives the original week, tasks and history rather than deleting them.
Earned XP remains included. Archived tasks cannot earn again; archived snapshots cannot
be removed or rewritten by synchronization. Teacher changes on archived quests are blocked.

Offline daily operations retain their original expected date. A late operation is rejected
with an explanation, never silently credited to another day. Weekly operations are not
limited by day. The UI waits for server confirmation before awarding repeat XP.

## Curriculum provenance and limits

This is a verified starter catalog, not a complete annual curriculum database.
TYT topics reuse the user's existing 35-quest program and requested Paragraf task.
Other lessons can use an explicitly entered topic. KPSS covers Genel Yetenek / Genel
Kultur, not specialized Alan Bilgisi or every education level.

- OGM AYT math contents: https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/konu-pekistirme/ayt/matematik/files/basic-html/page6.html
- OGM AYT biology: https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/konu-pekistirme/ayt/biyoloji/files/basic-html/page8.html
- OGM Turkish reference: https://ogmmateryal.eba.gov.tr/kitap/mebi-konu-ozetleri/tyt-turkce/tyt-turkce.pdf
- OSYM 2026 KPSS guide, table 1: https://dokuman.osym.gov.tr/pdfdokuman/2026/KPSS/LISANS/kilavuz_Ld01072026.pdf
- OSYM YKS subjects: https://www.osym.gov.tr/2026-yks-sonuclari-aciklandi

## Production approval checklist

1. Obtain explicit approval for the SQL migration separately from deployment.
2. Export encrypted/private independent backups and record board versions/counts.
   Do not publish exports, session files or account credentials as build artifacts.
3. Ask pilot users to pause edits briefly. Compare the deployed old schema and RPC with
   the migration's prerequisites; an unexpected schema means stop, not improvise.
4. Apply the reviewed migration to the EXISTING production project only after approval.
   Compare board hashes, Auth count and old row counts; run read-only RLS/grant checks.
5. Restore the live PUBLIC config for a separately reviewed production-ready commit.
   Never promote the staging-configured preview. The production build guard rejects it.
6. Request approval identifying that exact commit, branch, team and existing Vercel project.
7. Release, verify Auth, shell assets and PWA update read-only; do not run write tests on real users.

## Backup / rollback

- A failed migration rolls back atomically. Fix and retest, do not force past hash mismatches.
- Before any new completion event, rollback can use the saved legacy RPC definition only
  after comparing all current data with the backup and preparing/reviewing reverse DDL.
  No automatic reverse migration is bundled; restoring snapshots could overwrite user work.
- AFTER new repeats or archived weeks exist, do not drop the ledger, restore old JSON,
  reset users, or redeploy an old client that computes XP from `done * xp`.
  Disable new repeat creation if needed and fix forward while preserving ledger and history.
  A rollback UI must retain the new XP reader and server-owned fields.
- Retain the previous production deployment identifier for appearance-only rollback.

Installed PWA icon changes may be delayed by Android/iOS launcher caching. Reopen the
installed app after the update; reinstall only if the OS refuses to refresh its icon.

## v1.1 XP provenance follow-up

`20261015_competitive_xp.sql` follows the repeat migration. It snapshots existing boards
and the RPC definition, refuses ambiguous legacy teacher markers, adds an insert/update
provenance trigger, and compares exact original JSON and versions before commit.
Neither migration has been applied to production.

Competitive XP comes only from accepted assignment rows owned by the student:
old one-time teacher tasks retain their existing done/current-reward calculation;
repeated teacher tasks use immutable ledger XP snapshots. Personal XP remains separate.
Archival and teacher disconnection do not remove earned balances. A live approved
connection is still required for a teacher to view a student's breakdown.

`read_board` returns an authenticated, server-calculated breakdown beside (not inside)
the old board JSON. Sync responses update confirmed balances. The browser does not
classify competitive credit using editable source, lockedForStudent or category labels.
Forged source/assignment/teacher identifiers are rejected. Arbitrary client summary fields
are ignored by the server calculator. Internal calculators and previous RPC entry points
are not executable by clients. Total XP and the single Programim screen are preserved.

Local tests: 78 database/security/sync checks; 31 navigation scenarios; 15 appearance
scenarios; 24 responsive style/theme combinations; 19 recurring-quest UI scenarios.
Build and syntax/lint checks pass. Eight release guards also pass; the staging-configured
branch is intentionally blocked from production builds. The project is JavaScript, with
no TypeScript source or configured typecheck; no unrelated TypeScript rewrite was made.

Both test migrations preserved the staging board fingerprints, account counts and board
counts at application time. Tests use synthetic accounts only. The staging security advisor
reports intentional no-policy private backup tables (deny-by-default) and an existing Auth
leaked-password-protection warning. No Auth setting has been changed:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
