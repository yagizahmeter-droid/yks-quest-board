# D.E.R.S. v1.1.3 Preview

## Scope

- Desktop spacing, readable controls, aligned cards and Turkish UI labels. Existing mobile tracks and Classic/Saydam appearance retained.
- Timestamp-based focus sessions: custom durations, pause/resume/skip/finish, manual/automatic repeating phases, separate sound preferences and one shared mini timer.
- Account-scoped offline time queue, deterministic segment IDs, server-computed durations and overlap rejection. Study time never changes XP.
- Istanbul daily summary derived from work segments and actual completion timestamps.
- Authorized weekly student reports, task questions/feedback/answers and unique editable weekly reviews.
- In-app notifications, read/unread, event deduplication, direct navigation and account notification preferences.
- Existing opaque admin previews extended with in-memory learning data, without network access.

## Data Safety

Base production commit: `11446002b2bb7fb8f87a7419357ccfc660c1d174`.
Branch: `ders-v1-1-3-preview`. Production and `main` are not modified.

Migrations: `supabase/migrations/20261020182434_learning_focus_interactions.sql` and `20261020194500_learning_request_identity.sql` (in-flight request account binding).
Applied only to isolated staging `hswipswqulolcwqvcjvi`. It creates five new RLS-protected tables, private authorized functions, a public invoker RPC and an assignment notification trigger. Existing board JSON, XP functions and existing RLS policies are not rewritten.

Staging board fingerprint before and immediately after migration:
`02868ba041232537e9fb35b31287eeea` (4 boards). Real production `jswgagzbetwviamiwcck` was not migrated or written.

Clients have SELECT-only access to the new tables; writes go through the authenticated RPC. Teacher access requires a currently approved connection. Disconnect revokes report/thread/time access immediately. Student ownership and message authorship are determined on the server.

## Verification

- `tests/focus-core.cjs`: elapsed time recovery, pause/break exclusion, skip, finish, manual/automatic transitions, validation, idempotent reload and Istanbul midnight split.
- `V113_ONLY=1 tests/integration.cjs`: new learning security plus existing repeat ledger, XP provenance and curriculum regression checks. 96 database checks.
- `tests/learning-browser.cjs`: question/answer/review/notification flows, focus recovery and offline queue, no timer XP, teacher program acceptance and second-device completion synchronization, six viewport widths and both styles/themes.
- Existing admin security/preview and 40 real-wheel workspace checks.
- `tests/learning-staging.cjs`: actual isolated Supabase Auth/RPC/RLS, teacher/student browser flows, time recording, sign-out, PWA assets and offline reload/reconnect. Synthetic accounts only.
- JavaScript lint/syntax and static build. This project has no TypeScript/typecheck configuration.

Screenshots are stored locally in ignored `test-results/`. Credentials, database files and test exports are excluded from builds and Git.

## Publication and Recovery

Preview uses staging configuration. The production build guard intentionally rejects this configuration. Do not promote this preview directly to production.

For a later approved production release: take a protected in-project backup, compare existing board/policy fingerprints, apply the reviewed additive migration, verify fingerprints again, set the existing production public configuration, build a production candidate and verify before assigning production domains.

Recovery: restore the prior application deployment first. Retain the new tables and records; v1.1.2 ignores them. No destructive rollback or data reset is required.

## Boundaries

Audio is unlocked by user interaction. Browsers/phones may suspend audio in background or when locked; background sound is not guaranteed. Physical-device audio/lock-screen behavior requires a device check. In-app notifications are not operating-system push notifications. Concurrent overlapping work from another device is rejected rather than double-counted; pending local records remain available with an error message.
