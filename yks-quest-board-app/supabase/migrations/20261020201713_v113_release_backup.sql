begin;
set local lock_timeout = '5s';
create schema if not exists ders_release_private;
revoke all on schema ders_release_private from public, anon, authenticated;
create table if not exists ders_release_private.app_snapshots (
  version text primary key,
  captured_at timestamptz not null default now(),
  data jsonb not null
);
alter table ders_release_private.app_snapshots enable row level security;
revoke all on ders_release_private.app_snapshots from public, anon, authenticated;

-- Only hashes/counts leave this schema. Existing app rows stay inside this database.
create function ders_release_private.v113_fingerprint() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t record; n bigint; digest text; result jsonb := '{}'::jsonb;
begin
  for t in select c.oid, n.nspname, c.relname, c.relacl, c.relrowsecurity
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and (
      (n.nspname='public' and c.relname=any(array['quest_board_states','user_profiles',
        'student_teacher_connections','teacher_plan_assignments','teacher_assigned_quests',
        'quest_change_requests','quest_completion_events','ders_admin_notes','ders_admin_events']))
      or (n.nspname='ders_private' and c.relname=any(array['board_backups','invite_attempts','teacher_invite_codes','teacher_update_backups']))
      or (n.nspname='ders_admin_private' and c.relname='members')
      or (n.nspname='auth' and c.relname=any(array['users','identities'])))
    order by n.nspname,c.relname
  loop
    execute format('select count(*),md5(coalesce(string_agg(row_data,'''' order by row_data),'''')) from (select to_jsonb(x)::text row_data from %I.%I x) q',t.nspname,t.relname) into n,digest;
    result := result || jsonb_build_object(t.nspname||'.'||t.relname,jsonb_build_object(
      'count',n,'hash',digest,'acl',t.relacl,'rls',t.relrowsecurity,
      'columns',(select md5(coalesce(string_agg(a.attname||':'||a.atttypid||':'||a.attnotnull,',' order by a.attnum),'')) from pg_catalog.pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped),
      'policies',(select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.policyname),'')) from pg_catalog.pg_policies p where p.schemaname=t.nspname and p.tablename=t.relname)));
  end loop;
  return result || jsonb_build_object('_existing_functions',(
    select md5(coalesce(string_agg(pg_catalog.pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''),'' order by p.oid),''))
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname=any(array['public','ders_private','ders_admin_private'])
      and p.prokind='f' and not(n.nspname='public' and p.proname='ders_learning')));
end $$;
revoke all on function ders_release_private.v113_fingerprint() from public, anon, authenticated;

do $$
declare t record; snapshot jsonb := '{}'::jsonb; rows jsonb;
begin
  -- Sorted SHARE locks keep this recovery snapshot internally consistent.
  for t in select key from jsonb_each(ders_release_private.v113_fingerprint()) where key not like '\_%' order by key loop
    execute format('lock table %s in share mode',t.key);
  end loop;
  for t in select key from jsonb_each(ders_release_private.v113_fingerprint()) where key not like '\_%' and key not like 'auth.%' order by key loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from %s x',t.key) into rows;
    snapshot := snapshot || jsonb_build_object(t.key,rows);
  end loop;
  insert into ders_release_private.app_snapshots(version,data)
    values('1.1.3',snapshot || jsonb_build_object('_checks',ders_release_private.v113_fingerprint()));
end $$;
commit;
