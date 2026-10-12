# D.E.R.S. Verification

## Completed, 2026-10-12

- 35 checks against an isolated real PostgreSQL database: original 35 quests and 3595 possible XP, migration backup and exact JSON preservation, role escalation, RLS, invite rotation/rate limit, connection reject/approve/revoke, program reject/accept, canonical teacher task protection, change reject/approve, CAS conflicts and offline three-way merge.
- 15 browser scenarios: empty account onboarding, teacher program send, student review/accept, second-device completion, change approval, completed tab/history/global XP, empty week/manual task, offline reconnect, personal editing, four viewport widths, mobile teacher progress/revocation, account isolation and offline PWA reload. Screenshots checked visually; task text width checked in edit mode.
- 12 scenarios on REAL Supabase Auth, REST API and browser sessions in the approved free `ders-staging` project (`hswipswqulolcwqvcjvi`): three identities, invite rejection/approval, unrelated access denied, acceptance preserving personal tasks, JSON tampering denied, approved change propagation, real browser login, assignment acceptance, PC-phone completion sync, offline undo synchronization, browser change approval and immediate API revocation.

No service-role or secret API key is used by the frontend or tests. Live tests use the publishable key and ordinary user sessions. Synthetic test credentials are kept in ignored `.env.staging-test.json`, never in Git or hosted assets. Test fixture transport in the local suite is explicitly separate from live Auth tests.

## Deployment

GitHub feature branch `ders-teacher-system`, draft PR #1. Vercel reports successful Preview deployment. Production branch and frontend are unchanged. Preview remains authentication-protected unless the user explicitly approves a temporary share URL. The branch's config points ONLY to staging; switch to the confirmed production project as a separate reviewed release step.

The staging-configured preview built successfully at commit 52ed780. After explicit approval for a temporary share link, Vercel rejected the lookup with HTTP 403 for the connector's project/team access. No share link was created and deployment protection was not changed. The preview still requires authorized Vercel sign-in. The development server serves an explicit static-asset allowlist, excluding credentials and account exports.

## Migration / Remaining Gates

Staging migration applied and tested on PostgreSQL 17. Local fresh migration tested with PostgreSQL 18. Staging's follow-up adds the primary key now included in the standalone migration source. Following explicit user approval on 2026-10-12, the production teacher migration was applied successfully after a full external export outside the app. Both complete board rows (JSON, hashes, versions, timestamps and client IDs) match the export exactly. Both accounts retain 35 quests / 3595 possible XP; two private database backups match, two Auth users remain and no profiles were created for them. All six public application tables have RLS enabled. Production frontend release still needs separate approval.

Security advisor INFO entries on three private tables reflect intentional deny-all RLS (no client policies). No missing public-table RLS issue was reported. Supabase's leaked-password protection remains disabled by default; it was not changed. Review that Auth setting separately before release: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Production performance advisors flag only the three existing board policies' per-row auth.uid() evaluation and unused newly created indexes. Existing policies were left unchanged; new workflow policies already use SELECT-wrapped auth.uid(). These are performance notices, not authorization failures.

Brand/domain availability is not verified. OCR photo parsing was preserved, but this pass did not measure OCR accuracy against every future program photo.

