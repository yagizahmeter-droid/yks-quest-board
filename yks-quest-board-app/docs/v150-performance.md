# M2 measured class loading

Fixtures: 26 program weeks, 10 quests per recipient, 25% pending recipients, 10/30/50/100 synthetic students. Compare the preserved full-detail M1 API with the demand-driven M2 overview, for the same teacher, class and selected week. All numbers are measured; no general speed guarantee is implied.

## Isolated staging PostgreSQL 17

Median of three warm server-side SQL calls; excludes HTTP and browser latency. Staging instance load varies, especially at 100 members. Benchmark records are inserted inside a subtransaction and rolled back before metrics return; preservation fingerprints passed and a separate check confirmed zero benchmark accounts remained.

| Students | Full detail ms | M2 overview ms | Full JSON bytes | M2 JSON bytes |
| --- | ---: | ---: | ---: | ---: |
| 10 | 255.204 | 15.094 | 1,208,196 | 6,304 |
| 30 | 769.993 | 31.612 | 3,606,726 | 14,309 |
| 50 | 1,560.296 | 74.814 | 6,005,256 | 22,310 |
| 100 | 16,011.064 | 549.128 | 12,001,597 | 42,368 |

Raw metrics and query plans: `test-results/v150-m2-staging-performance.json` (ignored test artifact). A standalone program-page query used the new `v150_program_page` index in the 50-member run; the planner chose a tiny sequential scan in other runs because only 41 program rows were visible. No existing index was removed or planner setting forced. The contribution index supports the ordered per-task cursor/page reads.

## Local PostgreSQL 18

Median of three calls including a new local client connection per call. These numbers are a separate environment and should not be compared directly with staging server-only durations.

| Students | Full detail ms | M2 overview ms | Full JSON bytes | M2 JSON bytes |
| --- | ---: | ---: | ---: | ---: |
| 10 | 482.5 | 257.4 | 1,083,269 | 5,644 |
| 30 | 1,148.4 | 233.6 | 3,232,919 | 12,780 |
| 50 | 1,439.8 | 222.1 | 5,382,566 | 19,911 |
| 100 | 2,770.6 | 286.3 | 10,756,700 | 37,790 |

## What changed

- The open class section is fetched; full task trees are loaded only when its recipient is expanded.
- Program, announcement, contribution, event and XP history lists have bounded pages. Filters retain server-authorized scope.
- Header, navigation, enhanced selects, open details and cards retain DOM identity; dirty forms, focus/caret, scroll and motion faces survive updates.
- Existing hidden/offline/session guards remain. Concurrent identical reads share a promise; stale responses cannot publish into another section/class/account. Successful mutations invalidate stale section caches. A rejected class read clears the cache.
- Realtime was not added; visible-only polling remains 15 seconds for cross-device refresh, with immediate refresh after local actions. The overview list is not fetched again on every active class poll.
