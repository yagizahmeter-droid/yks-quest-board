# D.E.R.S. v1.0 Production Preparation

Status: prepared, awaiting the user's explicit final deployment approval.

## Verified Target

- Vercel team: yagizahmeter-9033 (team_hzsDXTCF7PqB2EN7PDLe6OoL).
- Existing project: yks-quest-board-yks-quest-board-app (prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T).
- Live domain: https://yks-quest-board-yks-quest-board-app.vercel.app/.
- Project domain is verified and belongs to the intended project.
- Existing production deployment: dpl_BYumBTRgJQr32c3UkzAgKuqtEiPx, READY.
- Current production Git branch: main; commit 4411391e22144bf3364e471657e314e93672ab8e.
- Prepared local branch: ders-v1-production-ready, based on approved preview be779ab208f28e73eaa44314ecab99faaa1131cc.
- Live Supabase project: jswgagzbetwviamiwcck, ACTIVE_HEALTHY, eu-central-1.

## Configuration

Vercel reports zero project environment variables and zero hidden production variables. The application is a static PWA; the database URL and public publishable key come from config.js, which is copied into the public build. The release restores the same URL/key values used by the existing main production commit. The publishable key is active in the live project. No service-role or private API key is included, and no secret environment values were requested or exported.

The build now rejects production if config.js points anywhere other than the existing live Supabase project, contains a non-publishable key, or VERCEL_PROJECT_ID identifies a different project. --production runs this check locally; VERCEL_ENV=production runs it automatically during a Vercel production build.

## Data and Security Checks

Read-only live checks found two Auth accounts and two JSON boards. The live teacher schema is already present; there are currently zero profiles, teacher connections, assignments, assigned quests, or change requests. The existing users will use the existing onboarding flow when they first enter the new teacher/student system.

RLS is enabled on all nine public/private application tables. Board policies restrict access to the owner; teacher assignment/request policies require approved relationships. Anonymous callers cannot execute the teacher RPC. Privileged internal functions retain their fixed search_path and access restrictions. The existing schema, migrations, sync.js, and teacher.js are unchanged from the approved preview.

No live database mutation, migration, account creation, task completion, connection change, or reset was performed. Account, board, relationship, policy, and function fingerprints were recorded locally for comparison. Anonymous read-only API checks returned HTTP 200 for Auth settings with email auth enabled; anonymous board queries returned zero rows.

The security advisor has one existing warning: leaked-password protection is disabled. This preparation does not change Auth settings. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

The three private internal tables intentionally have RLS with no client policies; access is through the existing controlled functions. No permissive policies were added to remove these informational notices.

## Verification

- Seven production release checks pass: exact live config in output, only public assets, v1.0 retained, rejection of staging, explicit local production validation, rejection of private keys, and wrong-project rejection.
- Production-mode build, JS/HTML/public-key lint, and whitespace checks pass.
- The final release checkout passed 35 isolated PostgreSQL/security/sync checks, 15 existing browser flows and 31 UI scenarios. All browser requests use fixture Auth/REST, never live user credentials. The first attempt was blocked by localhost network permissions; after the network grant the full suite completed successfully.
- The approved preview previously passed 35 database/security/sync, 15 browser, 31 UI, and 12 real staging Supabase scenarios, including PC/phone synchronization and reconnect after offline use.
- No production deployment has been started, including deployments without domain assignment. The production Git branch and domain remain on the existing release.

## Approval and Publication

Before release, report the exact prepared commit to the user. Do not move main, promote a preview, or create a production deployment until the user's explicit final approval. Keep the live-config preparation branch local so Git preview automation cannot publish a preview connected to live accounts.

After approval, recheck the unchanged main head and production target. Publish the reviewed commit through the existing main Git integration, using a guarded fast-forward update from 4411391e22144bf3364e471657e314e93672ab8e. If main has advanced, inspect the new changes before proceeding. Verify the resulting production deployment's exact commit, domain and served live config. Do not apply a database migration.

## Rollback

The previous READY production deployment dpl_BYumBTRgJQr32c3UkzAgKuqtEiPx remains available as the frontend rollback point. Rollback changes frontend hosting only; do not restore or overwrite user boards. Vercel rollback disables automatic domain assignment for later Git deployments, so review that state before a subsequent release. Browser caches use the existing service-worker update mechanism; retain a recoverable Git/config snapshot.

Physical Android hardware and real email delivery have not been tested. Live user login/write flows are reserved for the release verification with the user's account; no test users are added to the production database during preparation.
