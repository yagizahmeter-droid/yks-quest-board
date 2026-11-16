# D.E.R.S. v1.5.0 review — 16 November 2026

**State: implemented and verified locally, in real Supabase staging, and in the actual protected HTTPS preview. Preview is ready for review. Production is not authorized. Firefox/physical-device/OS-dialog limits remain explicitly unverified.**

Work branch: `ders-v150-workspace`. Native base `293ae1c`, M1 `fe0e9a9`, M2 `510bcc5`, M3–M6 checkpoint `647cefd`. M7 and local integration were recorded in `2219751`; this continuation records genuine staging evidence separately. GitHub `main` was checked again on 16 November: `2ea1d7a7013b32921f48852845b2bcfe06b70044` (v1.3.2). No main push, production migration or production deployment was performed.

## 1. Root causes corrected

- Pending/rejected/cancelled programs previously contaminated the homework denominator. Accepted, active tasks now define that denominator; repeat units and completed tasks are separate. Zero-denominator cases have an empty state.
- Current membership rows alone could mix leave/rejoin periods. Private interval history now scopes reads and delivery permission; unknown overwritten history is not invented.
- Peer aggregates could expose opt-out or sparse data. Only consenting eligible contributors are counted, with three-participant suppression and no granular peer trend buckets/private peer IDs.
- The 1900 all-time start diluted study averages. Actual eligible class/member dates and separate calendar-day/active-day denominators are used.
- Whole-page class rebuilding discarded focus, details and motion state. Keyed patches and scoped/paginated reads retain actual nodes and in-progress inputs.
- Switching a resized small window to free layout used its old stored rectangle instead of its current rendered rectangle: an actual 360px jump was reproduced. Pointer movement now starts at the measured on-screen rectangle; the final error is 0px.
- A narrow viewport could briefly retain a desktop inline window width until the resize callback. Responsive CSS now constrains that geometry before the callback. Frame sampling found zero overflowing frames in 48 Chromium viewport/style transitions.
- Account change cleared real windows but the page-transition layer could recreate their outgoing visual copies. Account changes now skip that outgoing snapshot; same-account motion remains active. Logout during a delayed export is covered by a real browser regression.
- Structural draft changes lacked a reliable dirty baseline, and copying during an outstanding save could target the wrong revision. Managed dirty checks detect true changes/reverts; copying waits for the original save before changing draft identity.
- Two simultaneous student reports previously reused control IDs. Workspace report IDs are scoped per student; legacy report IDs remain compatible.

## 2. Implemented behavior

| Area | Behavior | Verification boundary |
| --- | --- | --- |
| Class correctness/privacy | Accepted-only homework, separate statuses/units, scoped periods, consent aggregates, selective/idempotent approvals and terminal invite cleanup | Local PostgreSQL and real staging Auth/RLS/browser |
| Class loading | Keyed DOM, lazy sections and assignment details, bounded pages, coalesced reads, stale-owner/view rejection, visible polling | Local and real staging; measured 10/30/50/100 fixtures |
| Workspace | Shared composer; adjustable 57/43 new/history split; pin/hide and real draft preview; independent account drafts and revision conflicts | Local PostgreSQL/RLS plus actual protected HTTPS UI and real Supabase |
| Windows/dock | Single/two/triple/free, drag/resize/snap/max/min/close, same-node swaps, center-expanding dock with internal horizontal scrolling | Chromium, WebKit touch emulation; Firefox launch failed in this environment |
| Program tools | Validated send review, recipient outcomes, receipt-based retry, templates/search/filter/favorite/update/copy/delete and daily-date rebasing | Local PostgreSQL and browser; real hosted save/search/favorite/send verified |
| Acceptance/reminders | Acceptance and task progress separate; search/week/status, cancelled-program distinction, opt-out and server 24h cooldown | Local PostgreSQL and browser |
| Analysis | Shared validated period; authorized within-class 2–12-student comparison; missing/partial exam distinctions; contribution audit/corrections and non-punitive flags | Local PostgreSQL and browser |
| Reports | Previous-period comparison, subject averages, incomplete-task actions, CSV and browser print-to-PDF | Local browser download and print-frame boundary; physical OS print dialog not tested |
| Scheduling | Durable owner-only jobs, explicit Istanbul time, editing/cancel, private worker, bounded retries and saved authorization intervals | Real local PostgreSQL worker; native staging Cron 1.6.4 delivered to two recipients while the browser was closed |
| Action center | Authorized actionable counts/targets; local section ordering; real existing workflows | Local PostgreSQL and browser |
| Admin preview | Real shared components with isolated in-memory sample adapters; no network or writes to parent data | Both roles tested in opaque restricted frames |

## 3. Principal files

- Correctness/loading: `class-model.js`, `class-dom.js`, `classes.js`, `select-controls.js` and class migrations.
- Shared program flow: `program-composer.js`, `teacher.js`, `program-tools.js`, `program-schedules.js`.
- Workspace/reports: `teacher-workspace.js`, `teacher-workspace.css`, `teacher-insights.js`, `learning-ui.js`, `teacher-actions.js`.
- Safe integration: `ui.js`, `motion-ui.js`, `admin.js`, `admin-preview-workspace.js`, `admin-preview-classes.js`, `admin-preview.js`.
- Preview/package/cache: `index.html`, `package.json`, `release-history.js`, `service-worker.js`, static build/check/server asset lists.
- Evidence and recovery: `tests/v150-*`, `scripts/v150-*-migration.cjs`, `scripts/v150-staging-bundle.cjs`, and the three v150 reports in `docs/`.

## 4. Migrations and preservation

| Milestone | Migration | Remote staging state |
| --- | --- | --- |
| M1 | `20261115165626_v150_class_correctness.sql` | Applied; closed snapshot validated |
| M2 | `20261115171405_v150_class_sections.sql` | Applied; closed snapshot validated |
| M3 | `20261115174523_v150_workspace.sql` | Applied in atomic guarded staging bundle; snapshot validated |
| M4 | `20261115193156_v150_teacher_tools.sql` | Applied in atomic guarded staging bundle; snapshot validated |
| M5 | `20261115211500_v150_teacher_analysis.sql` | Applied in atomic guarded staging bundle; snapshot validated |
| M6 | `20261116001000_v150_scheduling.sql` | Applied in atomic guarded staging bundle; snapshot validated |
| M7 | `20261116012500_v150_teacher_actions.sql` | Applied in atomic guarded staging bundle; snapshot validated |

Guarded installation fixes the existing table catalog before adding objects, stores application/auth rows and function definitions/owners/ACLs inside server-only `ders_release_private.app_snapshots`, and fingerprints existing rows/public policies before and after. Any mismatch rolls back. No raw user backup was exported. New tables use RLS, bounded helper APIs and required FK/page indexes; no old index was removed.

`docs/v150-staging-install.sql` is a prepared atomic M3–M7 bundle **for staging only**. It requires the validated M2 snapshot, refuses repeat installation, enables native Cron if available and registers only its own named job. A conflicting existing job aborts instead of being overwritten. Local bundle tests use an explicit registration fixture and do not prove native Cron operation. See `v150-database-safety.md` for rollback.

## 5. Authorization checks

Tests reject students calling teacher-only APIs, unrelated teachers reading classes/student workspaces, cross-owner draft/template/schedule access, direct writes bypassing revision checks, calls to the private worker and unauthorized comparisons. Revoking a connection immediately denies reads without deleting drafts. Delivery rechecks class archive, current link/member status and the originally saved membership/connection periods. CSV/print revalidate access; logout during the response clears private windows and suppresses download. Client code contains no service-role credential.

The detailed adversarial matrix runs locally against PostgreSQL RLS. M3–M7 also passed eight genuine staging Auth/RLS/integration groups, including actual UI and native Cron; M1/M2 retain ten separate genuine staging groups. Anonymous/authenticated worker execution is denied. All seven preservation flags are true.

## 6. Test results

- **81 local PostgreSQL/security groups and 42 actual Chromium browser groups passed** in the final M1–M7 integration run. Browser Auth is a local transport fixture; every data operation reaches real PostgreSQL with authenticated RLS. No production requests.
- **28 atomic bundle tests** passed earlier: data/policy preservation, backups, dependency checks, repeat-install refusal and inactive-scheduler behavior. Embedded PostgreSQL has no native Cron extension.
- **10 real staging groups for M1/M2 plus eight real staging groups for M3–M7 passed.** The latter cover authenticated roles, approved connections, class invitation/approval, draft revision race and RLS, templates, idempotent send/acceptance/repeats, report/audit/action-center privacy, actual desktop/mobile UI and native Cron delivery with the browser closed. Only pre-existing synthetic example.com accounts were used.
- **30 class-refresh regressions**, targeted keyed-DOM preservation, **10 date/report UI checks**, **11 surface hook checks**, and **10 Focus groups / 40 appearance combinations** passed.
- Instant-feedback regression with a deliberately delayed 2-second response passed: tick/pop/XP begin in the original input event; first measured frames were about 16–33ms in this run. This is not a universal frame-rate guarantee or a zero-paint-time claim. Rollback, undo and deduplicated retries passed.
- **13 Motion System 2 groups** passed after the account-snapshot fix, including same-account transitions, interruptions, modal focus/exit, themes, touch and reduced motion.
- Resize regression: reproduced 360px jump; final measured error 0px. Responsive geometry: 48 Chromium viewport/style changes, zero overflowing sampled frames.
- Production static build and JavaScript/public-config/duplicate-ID checks passed. This app is plain JavaScript, not a TypeScript project.
- PWA manifest/icon URLs, new-asset caching and actual offline reload passed both locally and on the protected HTTPS Vercel preview. No private API responses are cached. Footer overlap suppression is intentional and preserved.
- **12 actual hosted HTTPS groups passed**: exact asset/config hash verification; real catalog/draft/template/send UI; student acceptance; same-click feedback during a delayed real request; two-session completion/reload with exactly 100 task XP; acceptance tracking; schedule create/edit/cancel; authorized CSV; server-authorized admin role previews with no frame network/parent writes; four appearances at 360/390/430px. All use synthetic staging accounts and zero production requests.
- Firefox was downloaded but headless launch timed out before browser verification. Firefox is **not reported as passed**. Physical phones, physical haptics, OS install and OS PDF dialog remain untested.

Reproduction: set `V150_M2`, `V150_WORKSPACE`, `V150_WORKSPACE_BROWSER`, `V150_TOOLS`, `V150_ANALYSIS`, `V150_SCHEDULER`, `V150_ACTIONS`, `V150_POLISH` to `1`, then run `tests/v150-db.cjs` with the documented local dependency/browser runtime. Do not run two embedded DB suites concurrently (port 55453). Inspect the final RESULT/artifacts, not only process exit status.

## 7. Measured performance

See `v150-performance.md` for methodology, actual 10/30/50/100 tables and query-plan limits. Staging warm SQL medians for full detail → M2 overview were 255.204→15.094ms (10), 769.993→31.612ms (30), 1560.296→74.814ms (50), and 16011.064→549.128ms (100). JSON for 100 members was 12,001,597→42,368 bytes. These are synthetic server-side SQL measurements, excluding HTTP/browser time; free-instance load varies. No claim of equivalent end-user latency is made.

## 8. Mobile and desktop

Four styles (Klasik/Saydam/Natural/Cloud), light/dark, 1440/360/390/430px are covered. Mobile uses one active student and switches between full new/history panels; maximization reserves header/footer space. Touch targets are at least 44px where tested. Dock scroll stays internal. Chromium Android and WebKit iPhone emulation include a shortened keyboard viewport; this is not a physical keyboard/device test. Layout preferences store IDs/rectangles/draft IDs only; program/exam content is not copied into local layout preferences.

## 9. Completed vs pending

M1/M2 are implemented and verified in staging. M3–M7 are implemented and locally integrated, including the action center and admin adapters. **Remote installation, real Supabase Auth integration, browser-closed native delivery, advisors and the complete protected Vercel preview have passed their documented checks.** Runtime development is ready for review; production remains held. Firefox, physical devices/haptics/OS installation and the OS PDF dialog are not claimed as tested.

## 10. Known limits

- Past task progress means current progress of programs belonging to the chosen period; it is not a fabricated historical snapshot. Reports explicitly state this.
- Overwritten legacy membership intervals or ambiguous legacy program dates cannot be reconstructed. Original text/records remain; no year is guessed from a renamed title.
- Comparison is within an authorized class and limited to 2–12 selected students.
- Contribution flags are review hints, never proof of misconduct or automatic penalties.
- Native scheduler resolution is about one minute; retries preserve sent receipts and do not undo delivered assignments. In staging Cron 1.6.4, one job delivered to two recipients with one successful receipt each and one attempt. Native job execution logs independently show succeeded runs.
- Template searches and table pages are bounded; local layouts do not synchronize student content to browser storage.

## 11. Verified staging preview

- [Immutable tested preview](https://yks-quest-board-yks-quest-board-bxdrswemv-yagizahmeter-9033.vercel.app/), deployment `dpl_E1ajUdPh7tWFhH7VzKoLFwo6KMRa`, **READY**, target preview.
- Application commit: `7d5557e650a6cfdcafe95277e40d61fe832ca5ef`, branch `ders-v1-5-0-workspace-preview`, existing project `prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T`, team `yagizahmeter-9033`.
- Deployment protection stays enabled. A 23-hour share link was issued to the user; its temporary token is not stored in committed documentation. Later documentation/test-only branch commits retain the same runtime bytes; this immutable deployment remains the fully exercised review target.
- Actual deployed config/workspace/program-tools/motion-ui content hashes match the reviewed preview tree. Config uses only the public staging key for `hswipswqulolcwqvcjvi`; production build guard rejects that preview config.
- Production `dershub.vercel.app` was independently checked: deployment `dpl_EFJMVKjNFyyQLwyVXCwx9QerDEWs`, READY, target production, main `2ea1d7a7013b32921f48852845b2bcfe06b70044` unchanged.

## 12. Release gates and recovery

1. Completed: atomic M3–M7 staging installation, seven preservation flags, restricted worker grants and only the named native Cron job. Manual SQL installation is no longer needed; repeat installation is rejected.
2. Completed: eight real staging Auth/RLS/UI/Cron groups plus 12 actual hosted browser groups, protected-preview source/endpoint hashes, native execution logs, actual HTTPS offline PWA and READY verification. Only synthetic example.com accounts were used; the existing synthetic admin flag was reused without adding a role grant.
3. Completed: post-install security/performance advisors. Policyless-RLS INFO entries are intentionally closed private tables, including reminders; unused-index INFO entries are retained. The existing leaked-password WARN is unchanged. No paid Auth feature or unrelated policy was enabled. See [closed-table advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [existing Auth warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
4. Awaiting user review and separate explicit production approval. Before a release: recheck live schema/config/commit, prepare the correct missing guarded migrations with a fresh server-only backup, retain a rollback deployment and validate preservation. Do not promote the staging-config preview to production.
5. Recovery details are in `v150-database-safety.md`. Stop only the named workspace Cron job if rolling back; retain new jobs/receipts/backups for audit. Never overwrite newer rows with old snapshots or drop the Cron extension/other jobs.

## Real staging execution evidence

Native pg_cron 1.6.4 registered `ders-v150-program-dispatch` every minute as postgres. The test browser closed before future delivery; the job finished in one attempt with two unique successful recipient receipts. Independent Cron rows at 10:26/10:27/10:28/10:29 UTC report success. Anonymous/authenticated worker EXECUTE is false. All seven closed-snapshot validation flags are true.

Synthetic drafts/templates were deleted with revision checks and the synthetic integration class archived. Sent assignments, cancelled schedules and receipts remain for test audit. No production request or real-user write occurred. Actual hosted screenshots were visually inspected. Machine-readable, non-personal evidence is in `v150-evidence.json`.
