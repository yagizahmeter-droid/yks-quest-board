# D.E.R.S. v1.5.0 review — 16 November 2026

**State: local integration and real Supabase staging/Auth/native Cron verified. Complete hosted preview verification is the remaining release gate; production is not authorized.**

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
| Workspace | Shared composer; adjustable 57/43 new/history split; pin/hide and real draft preview; independent account drafts and revision conflicts | Local PostgreSQL/RLS plus actual Chromium UI |
| Windows/dock | Single/two/triple/free, drag/resize/snap/max/min/close, same-node swaps, center-expanding dock with internal horizontal scrolling | Chromium, WebKit touch emulation; Firefox launch failed in this environment |
| Program tools | Validated send review, recipient outcomes, receipt-based retry, templates/search/filter/favorite/update/copy/delete and daily-date rebasing | Local PostgreSQL and browser; remote M4 pending |
| Acceptance/reminders | Acceptance and task progress separate; search/week/status, cancelled-program distinction, opt-out and server 24h cooldown | Local PostgreSQL and browser |
| Analysis | Shared validated period; authorized within-class 2–12-student comparison; missing/partial exam distinctions; contribution audit/corrections and non-punitive flags | Local PostgreSQL and browser |
| Reports | Previous-period comparison, subject averages, incomplete-task actions, CSV and browser print-to-PDF | Local browser download and print-frame boundary; physical OS print dialog not tested |
| Scheduling | Durable owner-only jobs, explicit Istanbul time, editing/cancel, private worker, bounded retries and saved authorization intervals | Real local PostgreSQL worker; native staging Cron is not yet installed/verified |
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
- PWA manifest/icon URLs, the new-asset cache and actual offline shell reload passed. Private API responses are not cached. The intentional mobile footer overlap guard is preserved; release-history interaction is covered separately by Motion2.
- Firefox was downloaded but headless launch timed out before browser verification. Firefox is **not reported as passed**. Physical phones, physical haptics, OS install and OS PDF dialog remain untested.

Reproduction: set `V150_M2`, `V150_WORKSPACE`, `V150_WORKSPACE_BROWSER`, `V150_TOOLS`, `V150_ANALYSIS`, `V150_SCHEDULER`, `V150_ACTIONS`, `V150_POLISH` to `1`, then run `tests/v150-db.cjs` with the documented local dependency/browser runtime. Do not run two embedded DB suites concurrently (port 55453). Inspect the final RESULT/artifacts, not only process exit status.

## 7. Measured performance

See `v150-performance.md` for methodology, actual 10/30/50/100 tables and query-plan limits. Staging warm SQL medians for full detail → M2 overview were 255.204→15.094ms (10), 769.993→31.612ms (30), 1560.296→74.814ms (50), and 16011.064→549.128ms (100). JSON for 100 members was 12,001,597→42,368 bytes. These are synthetic server-side SQL measurements, excluding HTTP/browser time; free-instance load varies. No claim of equivalent end-user latency is made.

## 8. Mobile and desktop

Four styles (Klasik/Saydam/Natural/Cloud), light/dark, 1440/360/390/430px are covered. Mobile uses one active student and switches between full new/history panels; maximization reserves header/footer space. Touch targets are at least 44px where tested. Dock scroll stays internal. Chromium Android and WebKit iPhone emulation include a shortened keyboard viewport; this is not a physical keyboard/device test. Layout preferences store IDs/rectangles/draft IDs only; program/exam content is not copied into local layout preferences.

## 9. Completed vs pending

M1/M2 are implemented and verified in staging. M3–M7 are implemented and locally integrated, including the action center and admin adapters. **Remote installation, real Supabase Auth integration for new APIs, native timed delivery with browser closed and post-install advisors are now verified.** Complete hosted Vercel preview checks still remain. No production action has occurred.

## 10. Known limits

- Past task progress means current progress of programs belonging to the chosen period; it is not a fabricated historical snapshot. Reports explicitly state this.
- Overwritten legacy membership intervals or ambiguous legacy program dates cannot be reconstructed. Original text/records remain; no year is guessed from a renamed title.
- Comparison is within an authorized class and limited to 2–12 selected students.
- Contribution flags are review hints, never proof of misconduct or automatic penalties.
- Native scheduler resolution is about one minute; retries preserve sent receipts and do not undo delivered assignments. In staging Cron 1.6.4, one job delivered to two recipients with one successful receipt each and one attempt. Native job execution logs independently show succeeded runs.
- Template searches and table pages are bounded; local layouts do not synchronize student content to browser storage.

## 11. Staging preview

The previously blocked installation succeeded through `v150_m3_m7_guarded_staging_bundle`. Manual SQL installation is no longer needed and would be rejected by its repeat guard. The existing Vercel project/repository/team were verified. A new, non-main, staging-only preview is being prepared; old v1.4.0 URLs are not substitutes.

## 12. Hosted preview and production release gates

1. Confirm the prepared bundle actually committed in `hswipswqulolcwqvcjvi`; check all five new preservation flags, APIs, RLS/ACLs and only the named native Cron job.
2. Run `tests/v150-workspace-staging.cjs` with synthetic example.com accounts. Set `V150_NATIVE_CRON=1` to schedule actual future delivery, close the browser, wait for native execution, and verify receipts/Cron execution logs. Failed runs preserve audit rows and cancel only their own pending schedules.
3. Run staging advisors and inspect native job ownership/health and send results; fix actual findings without weakening access controls.
4. Commit/push the verified candidate to a non-main branch in the existing repository/project, configure its public staging endpoint, verify READY/SHA/environment and issue a protected preview share link.
5. Submit the complete preview and evidence for review. Production needs separate explicit approval, fresh closed backup/preservation checks, reviewed migrations and a rollback deployment. No production action is included in this development task.

## Real staging continuation evidence

On 16 November, the guarded M3–M7 bundle committed in `hswipswqulolcwqvcjvi`, all seven snapshots validated, and native Cron 1.6.4 registered only `ders-v150-program-dispatch` (`* * * * *`, postgres). Anonymous/authenticated direct worker execution is denied. The actual browser closed before the future schedule was delivered; both recipients have one sent receipt and the job has one attempt. Independent Cron execution rows at 10:26/10:27/10:28/10:29 UTC report success. Synthetic drafts/templates were deleted with revision checks, the synthetic class was archived, and sent receipts remain for audit. No production request or real-user write occurred.

Post-install advisors found no new public-RLS/privileged-API error: INFO policyless-RLS entries are intentionally closed private tables (including reminders); unused-index INFO entries are retained. The existing leaked-password-protection WARN is unchanged; no paid Auth feature or unrelated policy was enabled. References: [private closed-table advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [existing Auth warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
