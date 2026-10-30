# Student personal task creation

- The student lesson-creation button and form are removed. Existing category IDs, filters and groups remain. Catalog lessons are attached to the board only when the first task in that lesson is saved, so an empty account can still start. Existing manual lessons remain under Belirtilmemiş.
- The personal form offers Weekly Repeat and Daily Task. Topic selection/custom description still derives the internal title; no second free-text title field is introduced.
- Both teacher and student forms use DersQuests.repeatKinds and repeatSettings. Weekly targets are integers 1–100. Daily targets are the inclusive date range (1–31 days), with one completion per Europe/Istanbul day. Missed dates never auto-complete. Weekly tasks belong to the selected board week and remain flexible across its days.
- Completion, blocked dates, labels, counts and final status reuse DersQuests. Personal records retain their existing one-time reward at final target; teacher per-occurrence XP and competitive attribution are unchanged. Every personal occurrence has a unique history ID and date.
- Merge uses the same personal normalizer, sorting before deduplicating same-day events and capping the target. Concurrent final completions cannot create an extra reward or retained history event. Local storage failures roll back partial personal completions and keep the draft.
- The existing owner-scoped JSON board format already stores repeat/completion metadata. No schema, migration, RLS, account or historical record rewrite is needed. Old normal tasks keep their behavior. Existing week reset continues to preserve repeating records, as before.
- PWA shell revision r2 includes the changed UI without clearing user storage. This branch does not change the public version number or deploy production.

Verification: tests/personal-repeat-core.cjs, tests/personal-repeat-browser.cjs and tests/personal-repeat-staging.cjs; existing database/teacher regression and release-build checks. Test writes use synthetic accounts in the isolated Supabase project only.
