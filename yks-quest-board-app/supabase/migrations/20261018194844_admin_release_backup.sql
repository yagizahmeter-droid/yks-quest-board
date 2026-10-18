begin;
create schema if not exists ders_release_private;
revoke all on schema ders_release_private from public, anon, authenticated;

create table ders_release_private.app_snapshots (
  version text primary key,
  captured_at timestamptz not null default now(),
  data jsonb not null
);
alter table ders_release_private.app_snapshots enable row level security;
revoke all on ders_release_private.app_snapshots from public, anon, authenticated;

-- Keep the recovery copy in the same database, never in the public API or client.
insert into ders_release_private.app_snapshots(version,data)
select '1.1.2', jsonb_build_object(
  'public.quest_board_states', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.quest_board_states t),
  'public.user_profiles', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.user_profiles t),
  'public.student_teacher_connections', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.student_teacher_connections t),
  'public.teacher_plan_assignments', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.teacher_plan_assignments t),
  'public.teacher_assigned_quests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.teacher_assigned_quests t),
  'public.quest_change_requests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.quest_change_requests t),
  'public.quest_completion_events', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.quest_completion_events t),
  'ders_private.board_backups', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ders_private.board_backups t),
  'ders_private.invite_attempts', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ders_private.invite_attempts t),
  'ders_private.teacher_invite_codes', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ders_private.teacher_invite_codes t),
  'ders_private.teacher_update_backups', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ders_private.teacher_update_backups t)
);
commit;
