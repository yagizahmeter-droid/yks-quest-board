# D.E.R.S.

Dijital Eğitim ve Rutin Sistemi. Existing Quest Board design and JSON data model are retained.

## Architecture

Static PWA: index.html, teacher.js, sync.js and locally bundled public Supabase SDK. Email/password authentication uses a publishable key only. Existing weeks, tasks, XP and history stay in quest_board_states.

Atomic teacher operations and optimistic synchronization use the authenticated ders_action RPC. Account-scoped offline storage and three-way merging preserve independent edits and remote additions. Explicit local edits win same-field conflicts; server-controlled teacher fields always win. Version checks prevent blind overwrites. PWA caches static same-origin assets only, never Supabase responses or student progress.

## Teacher / Student

After registration choose the account type and enter a display name once. Teachers create a seven-day invite code; rotation cancels older codes. Students submit the code and teachers approve or reject the request. Approved teachers send weekly programs. Students review and accept or reject them. Acceptance appends a new week without replacing personal tasks.

Teacher tasks are marked, are not bound to a day and can be completed normally. Editing requires a change request and teacher decision. Either participant can disconnect; future teacher access is revoked.

## Development

Install pinned dependencies with npm or pnpm:

```sh
npm start
npm test
```

Development address: http://127.0.0.1:4173. Tests create a separate local PostgreSQL cluster with synthetic accounts and use headless Chrome. They never write to production. Set SKIP_BROWSER=1 for database-only tests. Browser tests use the standard installed Chrome path on Windows.

For desktop sandbox asynchronous-realpath limitations, run Node with -r ./scripts/windows-realpath.cjs. Tests can also resolve packages from the sibling ders-test-runtime directory used during development.

tests/browser.cjs imitates GoTrue/REST transport with all data operations backed by real PostgreSQL and RLS. In addition, tests/staging.cjs verifies REAL Supabase Auth, REST API and browser sessions on the explicitly approved separate staging project. It requires an ignored local credentials fixture; no secret key is used. See TEST_REPORT.md for actual results.

## Database

Fresh staging projects need supabase-schema.sql followed by migrations/20261012_teacher_workflows.sql. Existing production already has the JSON table. Follow MIGRATION_PLAN.md first; do not apply the superseded 001 schema.

The separate free ders-staging project has been migrated and tested. This feature branch's config.js points only to staging. Following explicit approval, the production teacher migration was also applied with external and private database backups; both complete existing board rows and Auth accounts were preserved. Before promotion, change the target config only in a separately approved frontend release.

## Deployment

Publish a feature branch to Vercel Preview. Never merge main or promote without approval. The existing GitHub-to-Vercel main check succeeds; the Vercel connector's scope 403 requires reauthorization. Do not disable deployment protection as a workaround.

Publish only index.html, config.js, teacher.js, sync.js, service-worker.js, manifest.webmanifest, icons/ and vendor/. Tests, backups, SQL and dependencies are excluded by the static build script.

On HTTPS, sign in with the same account on PC and phone. Chrome menu > Ana ekrana ekle installs the PWA. Completion remains available temporarily offline and retries after reconnect. Invitations, approvals and program changes need internet.

Marka/domain uygunluğu doğrulanmadı.
