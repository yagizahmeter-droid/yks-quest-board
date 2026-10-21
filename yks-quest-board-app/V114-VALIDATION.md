# D.E.R.S. v1.1.4 Release Validation

Reviewed 2026-10-21. This release does not change a production database, migration,
RLS policy, account role, or saved user record.

## Catalog

- One shared curriculum module for personal and teacher task forms.
- TYT: 9 lessons, 74 categories, 550 selectable topic paths.
- AYT: 11 lessons, 111 categories, 870 selectable topic paths.
- KPSS: unchanged, 6 lessons, 6 neutral groups, 16 topics.
- Official book URLs, hashes, TOC pages, source titles and 199 legacy path
  mappings are indexed by docs/catalog-v114-provenance.json and its lesson files.
- Source review, editorial groupings and scope uncertainties are described in
  docs/catalog-v114-review.md. This is not a guaranteed exhaustive 2027 syllabus.
- Existing legacy names, copied drafts, task IDs and XP are not rewritten.

## Root Causes and Changes

- Mobile admin: closing the drawer queued history.back(); its delayed popstate
  closed the newly opened admin modal. A modal handoff now replaces the drawer
  without starting a second navigation. Server authorization is unchanged.
- Timer: a full learning UI refresh and global form scan ran every 500ms.
  Unchanged sessions now emit a clock-only event; text changes are differential.
  New form baselines are collected only from added element subtrees.
- Long glass history lists no longer apply nested blur to every record.
- Focus settings use content-sized grid rows; mobile program actions have
  adequate widths and touch targets.
- Static labels use Turkish title casing without changing user text.
- Natural UI has static SVG vines and asymmetric organic corners. Cloud UI uses
  a nine-slice SVG cloud contour, not merely rounded rectangles.
- Existing appearance keys, custom image storage and classic/glass styles stay
  compatible. Red swatches and the applied accent share saturated red values.

## Verification

The following checks run only against an embedded local database, an explicitly
isolated Supabase test project, or network-blocked synthetic browser accounts:

- Full database/security/sync suite: 121 checks plus teacher/student UI,
  repeat XP, catalog, general scope, offline merge and two-device scenarios.
- Focused learning suite: 99 checks and browser conversations, reports,
  notifications, focus/offline recovery; time does not award XP.
- Hosted staging admin: real email/Tab/password/Enter login, role checks, RLS,
  note persistence, both sample previews, return and logout. Board unchanged.
- Hosted staging learning: report access, outsider denial, questions/reviews,
  offline PWA recovery and idempotent time sync; board/XP/version unchanged.
- Mini focus: 16 cases including both reset states, reload, navigation,
  offline retry and unchanged task XP/history.
- v114 browser: 32 viewport/style/theme combinations at 360/390/430/1440px;
  actual mouse wheel and dispatched touch events on long lists, admin scrolling,
  isolated preview assets, multiline Enter and red swatch/application equality.
- Existing appearance: 192 accent/style/theme/viewport combinations with
  button contrast, saved choices, reduced motion and no task changes.
- Release footer: 15 cases, mobile/landscape/desktop through 2560px, dialogs,
  keyboard, touch and no content overlap.
- Production build and syntax/public-configuration checks; release guards reject
  staging configuration, secret keys and a different Vercel project.

Controlled Windows Chrome measurement, 250 sample tasks and running timer:
5 seconds before = 221 DOM mutations, 20ms script, 10 layouts; after runs =
8-11 mutations, 2-4ms script, 4-5 layouts. Neither run contained a >50ms long task.
This is evidence of reduced repeated work, not a physical phone FPS benchmark.

Some historical tests still expected old labels, a 238px desktop sidebar,
pre-v1.1.3 tab counts and earlier release versions. Expectations were updated to
the preserved current behavior; assertions for data/XP/RLS remain active.

## Deployment and Rollback

- Existing project: prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T.
- Team: team_hzsDXTCF7PqB2EN7PDLe6OoL (yagizahmeter-9033).
- Production branch: main; repository: yagizahmeter-droid/yks-quest-board.
- Live URL: https://dershub.vercel.app/
- Supabase remains jswgagzbetwviamiwcck; no environment overrides are configured.
- Prior production commit: f15e57802ac1c5f04ca3994344b52ff805766251.
- Rollback deployment: dpl_GFfMMmBf45vuU6CZ7zr75vQvvtp5.
- A preview must be READY and verified before main advances. The old PWA browser
  is retained during promotion to verify shell upgrade and local-storage safety.
- No production data backup or migration is needed for this static-only release;
  rollback restores the previous frontend, without reversing user progress.

## Limits

Physical iOS/Android devices and a hardware touchpad were not available. Chrome
mobile emulation, real pointer/touch event dispatch, wheel, keyboard and viewport
tests do not replace a physical-device momentum/low-memory test.

No TypeScript project/configuration exists: a TypeScript typecheck is not
applicable. JavaScript syntax, build and behavioral checks are used instead.
Production account mutations are intentionally not used as deployment probes.
