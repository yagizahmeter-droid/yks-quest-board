# D.E.R.S. Verification

## UI Renewal, 2026-10-13

- 35 real local PostgreSQL security/data/sync checks passed again.
- 15 existing browser scenarios passed with navigation adapted to the new pages, including new account, empty program, assignment acceptance, global XP, history, offline completion, revocation and offline PWA v4.
- 31 additional UI scenarios passed: protected deep links, Auth callback consumption before routing, Turkish errors, light/dark/system theme and persistence, home composition, mobile back/forward, modal back and dirty warnings, history filters, unchanged JSON across navigation, account sync/sign-out, empty account lesson and quest creation, long names, 360/390/430/1280 light/dark layouts, heading contrast, collapse persistence, keyboard controls, teacher draft persistence/badges and late-response account isolation.
- 12 REAL Supabase Auth/API/browser scenarios passed on the separate staging project with the new navigation. Hosted Preview mode is available in tests/staging.cjs and checks the served database target before sign-in.
- Build, JS syntax/unique HTML ID/Lucide icon/public-key checks and Git whitespace checks passed. No database migration was performed for this renewal. config.js, sync.js, supabase-schema.sql and migrations have no diff against the preserved baseline.

Screenshots in test-results were inspected visually. Physical Android hardware and real email delivery/confirmation were not tested; Chrome viewport and History API flows were tested. Signup UI uses a clearly identified local Auth fixture; actual Supabase sign-in uses ordinary confirmed synthetic accounts. No production account or board was changed.

The UI branch is ders-ui-renewal, based on the preserved tested 94916b6 commit. Local baseline snapshot is d2c8c3a. See UI_RENEWAL_REPORT.md for the Turkish report and rollback notes.

## Completed, 2026-10-12

- 35 checks against an isolated real PostgreSQL database: original 35 quests and 3595 possible XP, migration backup and exact JSON preservation, role escalation, RLS, invite rotation/rate limit, connection reject/approve/revoke, program reject/accept, canonical teacher task protection, change reject/approve, CAS conflicts and offline three-way merge.
- 15 browser scenarios: empty account onboarding, teacher program send, student review/accept, second-device completion, change approval, completed tab/history/global XP, empty week/manual task, offline reconnect, personal editing, four viewport widths, mobile teacher progress/revocation, account isolation and offline PWA reload. Screenshots checked visually; task text width checked in edit mode.
- 12 scenarios on REAL Supabase Auth, REST API and browser sessions in the approved free `ders-staging` project (`hswipswqulolcwqvcjvi`): three identities, invite rejection/approval, unrelated access denied, acceptance preserving personal tasks, JSON tampering denied, approved change propagation, real browser login, assignment acceptance, PC-phone completion sync, offline undo synchronization, browser change approval and immediate API revocation.

No service-role or secret API key is used by the frontend or tests. Live tests use the publishable key and ordinary user sessions. Synthetic test credentials are kept in ignored `.env.staging-test.json`, never in Git or hosted assets. Test fixture transport in the local suite is explicitly separate from live Auth tests.

## Deployment

GitHub feature branch `ders-teacher-system`, draft PR #1. Vercel reports successful Preview deployment. Production branch and frontend are unchanged. Preview remains authentication-protected unless the user explicitly approves a temporary share URL. The branch's config points ONLY to staging; switch to the confirmed production project as a separate reviewed release step.

Initially Vercel rejected share-link creation with HTTP 403 because the connector lacked team/project access. The user subsequently authorized the correct project and a 23-hour share link was created for the existing staging preview. Protection settings and production remained unchanged. The UI renewal is released to a separate Preview from ders-ui-renewal only. The development server and hosted build use explicit asset allowlists, excluding credentials and account exports.

## Migration / Remaining Gates

Staging migration applied and tested on PostgreSQL 17. Local fresh migration tested with PostgreSQL 18. Staging's follow-up adds the primary key now included in the standalone migration source. Following explicit user approval on 2026-10-12, the production teacher migration was applied successfully after a full external export outside the app. Both complete board rows (JSON, hashes, versions, timestamps and client IDs) match the export exactly. Both accounts retain 35 quests / 3595 possible XP; two private database backups match, two Auth users remain and no profiles were created for them. All six public application tables have RLS enabled. Production frontend release still needs separate approval.

Security advisor INFO entries on three private tables reflect intentional deny-all RLS (no client policies). No missing public-table RLS issue was reported. Supabase's leaked-password protection remains disabled by default; it was not changed. Review that Auth setting separately before release: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Production performance advisors flag only the three existing board policies' per-row auth.uid() evaluation and unused newly created indexes. Existing policies were left unchanged; new workflow policies already use SELECT-wrapped auth.uid(). These are performance notices, not authorization failures.

Brand/domain availability is not verified. OCR photo parsing was preserved, but this pass did not measure OCR accuracy against every future program photo.
