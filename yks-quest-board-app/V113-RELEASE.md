# v1.1.3 Production Release

Date: 2026-10-20. Approved preview: ad9e47a08271a09e1e8c216d49dbd035c10e1a7e.
Target: existing Vercel project prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T,
team yagizahmeter-9033, branch main, https://dershub.vercel.app/.
Production public configuration: jswgagzbetwviamiwcck; no Vercel environment overrides.

## Database

Production schema and history were checked before applying the two missing migrations:
- learning_focus_interactions
- learning_request_identity

A server-only v113_release_backup migration first captured all 14 existing app tables
in ders_release_private.app_snapshots (version 1.1.3). Client access is revoked.
Auth account/identity records are hashed in place, not exported. Five accounts were present.
The earlier 1.1.2 snapshot remains untouched.

Both feature migrations ran with sorted SHARE locks, a 5-second lock timeout and
transaction-local before/after checks. Any change to original rows, account identities,
existing RLS policies, table privileges or original functions aborts the transaction.
The final comparison with the backup passed. Five new RLS tables are SELECT-only for
authenticated clients; writes use authenticated RPC. Anonymous RPC execution is denied.

## Release Checks

- Production build and syntax/configuration checks passed.
- 99 focused database/security checks passed, including preservation, repeat XP,
  provenance, teacher authorization/revocation and learning features.
- Focus core unit tests passed.
- 24 viewport/style/theme combinations passed at 360, 390, 430, 1366, 1440 and 1920px.
  Mouse, keyboard and touch selection passed with zero database requests.
- Hosted staging end-to-end and production PWA/read-only checks are recorded in the
  release report after deployment. Real-user task completion and timer writes are
  intentionally not exercised in production.

## Recovery

Previous main: 11446002b2bb7fb8f87a7419357ccfc660c1d174.
Previous production deployment: dpl_4P3m6BAYcWvFGviwQUnenh7JGAFZ.
Restore that application deployment first if needed. Retain additive learning tables;
v1.1.2 ignores them. Do not drop tables, restore over newer user changes or reset accounts.
Any data recovery must be scoped and reviewed against the closed in-project snapshot.

Known pre-existing advisor warning: leaked-password protection is disabled. No auth
configuration or existing RLS policy was changed by this release.
