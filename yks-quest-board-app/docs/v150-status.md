# v1.5.0 implementation ledger

Base verified 2026-11-15: production/main `2ea1d7a7013b32921f48852845b2bcfe06b70044` (v1.3.2); latest preview `65b2bc4a5a3bf078099c5258cd351ce69b404d72`; native base `293ae1c6894140f2b021b8c0fbf50acf854866b7`, identical candidate tree including optimistic feedback.

Work branch: `ders-v150-workspace`. Production deployment and production migration are prohibited for this task.

| Milestone | State | Remaining / evidence |
| --- | --- | --- |
| M1 correctness and privacy | verified in staging | Accepted-only denominator, private membership/connection spans, consent-only peer aggregates, real all-time range, selective/idempotent bulk approval with partial outcomes, terminal invite cleanup. 19 local PostgreSQL/security groups + 7 real staging/browser groups + 30 refresh regression scenarios passed. |
| M2 class architecture | verified in staging | Persistent keyed DOM, scoped/merged reads, lazy assignment details, bounded program/contribution/announcement/XP/event pages. 30 local DB/security groups, 30 refresh regression scenarios, targeted DOM/motion tests, 10 real staging/browser groups. 10/30/50/100-member benchmarks measured locally and in staging; see performance report. |
| M3 workspace | verified locally, in staging and hosted preview | Reused composer, independent student contexts, account drafts/revision conflicts, 57/43 adjustable history/real-preview split, same-node multiwindow layouts, drag/resize/snap/minimize/maximize, centered dock and 360px panels. Rapid interruption, reduced motion and the M7 theme/touch/geometry checks passed. |
| M4 program tools | verified locally, in staging and hosted preview | Actual send review and per-recipient outcomes, idempotent partial retry, account templates/search/favorite/independent drafts/daily-date rebasing, real-history templates, acceptance vs progress and cancelled-program distinction, opt-out/24h reminders. Send/schedule IDs now survive refresh for the same draft and contents. |
| M5 analysis | verified locally, in staging and hosted preview | Shared validated week/month/year/custom/all dates, teacher-only comparisons with separate scopes/missing/partial exams, verified study distribution, audited contribution/correction history and non-punitive flags, reports/previous period/academic subject averages/CSV. PDF uses browser print-to-PDF; manual print dialog still needs checking. |
| M6 scheduling | native staging Cron and hosted planning verified | Durable owner-only jobs, private server worker, recipient receipts, bounded retry, saved membership/connection-period checks, two-device conflicts and edit/cancel race protection. Local registration fixture is NOT real pg_cron. Native staging activation and automatic browser-closed delivery now passed; see final evidence. |
| M7 integration | verified preview; awaiting user review | Action center, isolated real-component admin adapters, multi-report/draft/geometry/logout safety and offline PWA implemented. 81 local database/security + 42 browser groups, eight new real staging groups and 12 actual hosted groups passed. Native Cron, advisors and HTTPS PWA verified. Firefox/physical devices/OS PDF dialog remain unverified. |

## Safety and verification

- Only isolated staging `hswipswqulolcwqvcjvi` and synthetic accounts may be mutated.
- Production `jswgagzbetwviamiwcck` stays unchanged.
- Existing board JSON, XP ledger, histories and connection records must not be rewritten by migrations.
- Additive membership/connection interval history cannot reconstruct previously lost intervals; historical uncertainty must be reported and handled conservatively.
- New migrations: inspect schema, keep a server-only schema/data preservation snapshot and rollback instructions, test locally before staging.
- Never claim mocks as real database integration or emulation as a physical device test.

## Verification log

- Initial Git state clean; production and preview refs verified through GitHub.
- Staging schema inspected read-only. Existing class defaults for sharing are already false.
- M1 migration `v150_m1_class_correctness_guarded` applied only to staging; server-only snapshot validated and period table client access denied. Production untouched; no v1.5.0 preview deployment yet.
- M1 syntax and production build checks passed. Real browser checks used desktop Chromium and a 360px viewport (emulation, not a physical phone).
- M2 migration `v150_m2_class_sections_guarded` applied only to staging; closed snapshot validation passed. A separate server-only staging benchmark helper rolls fixtures back before returning; independent check found zero benchmark accounts remaining. No production change.
- Latest M2 browser evidence: 10 real staging groups, fixed header/nav, open assignment/native dropdown, merged reads, search/focus and off-route query suppression. Targeted DOM test also preserves active motion face/pressed state/indicator. Chromium/WebKit touch regression passed for four themes at 360/390/430 px; not physical device tests.
- No v1.5.0 preview URL yet; the workspace and later milestones have since passed local integration (see latest continuation below), but remote integration remains unfinished.

## 2026-11-16 continuation

- Latest complete local run: **76 PostgreSQL/security groups + 24 actual Chromium browser groups passed**. Auth is a local transport fixture; all data operations reach real PostgreSQL/RLS. This is not Supabase Auth staging verification.
- M3/M4/M5/M6 SQL preservation transactions run locally; no production writes. Build/syntax passed before latest scheduling UI; final build and regressions remain required.
- Staging M3 installation has expired four times at the plugin confirmation bridge despite the user's approval. Read-only checks show `teacher_workspace_drafts` is absent, and the migration log ends at M2/benchmark helper. Do not retry indefinitely or bypass `apply_migration` through `execute_sql` DDL. Finish independent code/testing and prepare a concrete guarded staging bundle if the bridge remains unavailable.
- Remote M1/M2 tests/benchmarks stay valid. No remote M3–M6 migration or v1.5.0 full preview deployment has succeeded.
- Historical task progress is explicitly the **current progress of programs belonging to the chosen date period**, not an invented retrospective snapshot; study/exam data use actual scoped event dates. This limitation appears in the report itself.
- Remaining: M7 action center/reordering, admin sandbox adapter, expanded theme/mobile/motion/privacy/reliability checks; real staging M3–M6/Cron/Auth verification; complete preview and honest final report (completed in the later continuation below). Production remains prohibited.

## Latest continuation — local integration checkpoint

The earlier remaining-work list is superseded by this entry. M3–M7 UI/backend implementation is locally integrated; the full scope is still NOT complete until external staging verification passes.

- Final M1–M7 test run: **81 local PostgreSQL/security groups + 42 actual Chromium browser groups passed**, with local Auth transport and real authenticated PostgreSQL RLS. No production requests.
- Four styles, light/dark and 1440/360/390/430px; Android Chromium and iPhone WebKit touch emulation; offline draft/revert, in-flight draft copy, independent report controls and logout during delayed export passed.
- Actual resize reproduced a 360px jump; corrected rectangle origin gives 0px final error. Chromium sampled 48 style/viewport transitions with zero overflow frames after immediate responsive constraints.
- Logout formerly recreated private outgoing animation snapshots after real windows were cleared. Account changes now skip those snapshots; same-account animations remain. **13 Motion2 groups**, 2-second delayed optimistic feedback, Focus, dates, surface hooks and class refresh regressions passed.
- PWA shell and all new workspace assets cached and reloaded offline; manifest/icon paths valid; no private API caching. Footer overlap suppression is intentional and is not overridden by PWA tests.
- Firefox was downloaded, but headless startup timed out; Firefox/physical devices/OS PDF dialog are not reported as tested.
- Version/package/release notes now identify **1.5.0 preview**. Board schema version remains 2. Static production build and syntax/public-config/ID checks passed.
- `docs/v150-staging-install.sql` is the validated atomic staging-only M3–M7 bundle already offered to the user. It was not silently changed while awaiting manual installation.
- `tests/v150-workspace-staging.cjs` is prepared for real Auth/RLS/UI and browser-closed native Cron verification. Its read-only application preflight confirms the remote `ders_workspace` endpoint is still absent; no new fixtures were written.
- GitHub main rechecked: `2ea1d7a7013b32921f48852845b2bcfe06b70044`. No remote v150 branch, no complete v150 Vercel preview and no production changes.
- Full twelve-part evidence/limits/release checklist: `docs/v150-review.md`. Remaining dependency is actual M3–M7 staging installation, then real integration/Cron/advisors and preview.

## Real staging continuation — supersedes the earlier external blocker

- `v150_m3_m7_guarded_staging_bundle` succeeded. All M1–M7 closed preservation flags are true. The previously offered manual SQL step is no longer required.
- Native Cron 1.6.4 is installed. Only the named workspace job is registered every minute as postgres; the private worker is not client-executable.
- **Eight genuine staging Auth/RLS/UI/Cron integration groups passed** on synthetic example.com accounts, zero production requests. The browser was closed before actual timed delivery to two recipients; one attempt and two unique successful receipts were independently verified.
- Post-install advisors checked: intentional private deny-all tables and retained unused indexes are INFO; existing Auth leaked-password warning remains unchanged. No public RLS/security error was introduced.
- Firefox still cannot launch in this Windows runtime, including with isolated writable profile state; it is not claimed as verified.
- Remaining: publish/verify the complete staging-only Vercel preview and update final evidence. Production remains prohibited.

## Final verified review target

- Existing Vercel project, branch `ders-v1-5-0-workspace-preview`, application commit `7d5557e650a6cfdcafe95277e40d61fe832ca5ef`, deployment `dpl_E1ajUdPh7tWFhH7VzKoLFwo6KMRa` is READY. The 23-hour protected share link was delivered separately.
- **12 actual hosted HTTPS groups passed**, including real teacher/student/admin interfaces, program drafting/templates/send/accept, two-session 2/2 completion with exactly 100 task XP, real schedule edit/cancel, CSV and mobile styles. Config and selected runtime hashes match the reviewed tree; zero production requests.
- **Actual protected HTTPS PWA installation/cache/offline reload passed** in browser emulation, in addition to the local PWA check. Physical OS installation remains untested.
- Production guard build and syntax/ID/public-config checks passed. Production `dershub.vercel.app` still serves main `2ea1d7a7013b32921f48852845b2bcfe06b70044` from the same original deployment. No production migration, push or deployment.
- Implementation is ready for user review, with explicit Firefox/physical-device/OS-PDF limits. `docs/v150-review.md` and `docs/v150-evidence.json` supersede older pending-work notes.
