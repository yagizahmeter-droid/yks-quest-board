begin;
create schema if not exists ders_admin_private;
revoke all on schema ders_admin_private from public, anon, authenticated;
grant usage on schema ders_admin_private to authenticated;

create table ders_admin_private.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table ders_admin_private.members enable row level security;
revoke all on ders_admin_private.members from public, anon, authenticated;

-- The only elevated operation is a membership lookup for the authenticated caller.
create function ders_admin_private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists (
  select 1 from ders_admin_private.members where user_id = auth.uid()
) $$;
revoke all on function ders_admin_private.is_admin() from public, anon;
grant execute on function ders_admin_private.is_admin() to authenticated;

create function public.ders_admin_status() returns boolean
language sql stable security invoker set search_path = ''
as $$ select ders_admin_private.is_admin() $$;
revoke all on function public.ders_admin_status() from public, anon;
grant execute on function public.ders_admin_status() to authenticated;

create table public.ders_admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug','suggestion')),
  context text not null check (context in ('student','teacher','appearance')),
  screen text not null default 'Genel' check (char_length(btrim(screen)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.ders_admin_notes enable row level security;
revoke all on public.ders_admin_notes from public, anon, authenticated;
grant select, insert on public.ders_admin_notes to authenticated;
create policy admin_notes_read on public.ders_admin_notes for select to authenticated
  using (user_id = (select auth.uid()) and (select ders_admin_private.is_admin()));
create policy admin_notes_create on public.ders_admin_notes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select ders_admin_private.is_admin()));
create index admin_notes_owner_date on public.ders_admin_notes(user_id, created_at desc);

create table public.ders_admin_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('panel_open','preview_open','preview_return','sample_reset','note_saved')),
  context text not null check (context in ('admin','student','teacher','appearance')),
  created_at timestamptz not null default now()
);
alter table public.ders_admin_events enable row level security;
revoke all on public.ders_admin_events from public, anon, authenticated;
grant select on public.ders_admin_events to authenticated;
create policy admin_events_read on public.ders_admin_events for select to authenticated
  using (user_id = (select auth.uid()) and (select ders_admin_private.is_admin()));
create index admin_events_owner_date on public.ders_admin_events(user_id,created_at desc);

create function ders_admin_private.record_event(p_id uuid,p_action text,p_context text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not ders_admin_private.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_action not in ('panel_open','preview_open','preview_return','sample_reset') then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  insert into public.ders_admin_events(id,user_id,action,context)
    values(p_id,auth.uid(),p_action,p_context);
end $$;
revoke all on function ders_admin_private.record_event(uuid,text,text) from public,anon;
grant execute on function ders_admin_private.record_event(uuid,text,text) to authenticated;
create function public.ders_admin_record_event(p_id uuid,p_action text,p_context text) returns void
language sql security invoker set search_path = ''
as $$ select ders_admin_private.record_event(p_id,p_action,p_context) $$;
revoke all on function public.ders_admin_record_event(uuid,text,text) from public,anon;
grant execute on function public.ders_admin_record_event(uuid,text,text) to authenticated;

create function ders_admin_private.note_saved() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.ders_admin_events(user_id,action,context) values(new.user_id,'note_saved',new.context);
  return new;
end $$;
revoke all on function ders_admin_private.note_saved() from public,anon,authenticated;
create trigger admin_note_saved after insert on public.ders_admin_notes
  for each row execute function ders_admin_private.note_saved();
commit;
