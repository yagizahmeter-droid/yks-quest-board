const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const files=['20261112192235_v132_performance.sql','20261112192236_v132_history_restore.sql'];
module.exports=function guarded(){
 const body=files.map(f=>fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8')).join('\n');
 return `begin; set local lock_timeout='5s'; set local statement_timeout='45s';
 do $backup$
 declare t record;rows jsonb;bundle jsonb:='{}';policies jsonb;indexes jsonb;users jsonb;
 begin
  if to_regclass('ders_release_private.app_snapshots') is null then raise exception 'Existing closed backup store is required';end if;
  if has_schema_privilege('authenticated','ders_release_private','USAGE') or has_table_privilege('authenticated','ders_release_private.app_snapshots','SELECT') or has_table_privilege('anon','ders_release_private.app_snapshots','SELECT') then raise exception 'Backup access is not closed';end if;
  if exists(select 1 from ders_release_private.app_snapshots where version='v1.3.2-pre') then raise exception 'Backup already exists: inspect migration history; do not repeat blindly';end if;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname loop
   execute format('lock table public.%I in share mode',t.relname);
   execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb) from public.%I x',t.relname) into rows;
   bundle:=bundle||jsonb_build_object(t.relname,rows);
  end loop;
  select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') into policies from pg_policies p where schemaname='public' or schemaname like 'ders%';
  select coalesce(jsonb_agg(to_jsonb(i) order by schemaname,tablename,indexname),'[]') into indexes from pg_indexes i where schemaname='public';
  select coalesce(jsonb_agg(to_jsonb(u) order by u.id),'[]') into users from auth.users u;
  insert into ders_release_private.app_snapshots(version,data) values('v1.3.2-pre',jsonb_build_object('tables',bundle,'policies',policies,'indexes',indexes,'auth_users',users,'_checks',jsonb_build_object('tables_hash',md5(bundle::text),'auth_hash',md5(users::text))));
 end $backup$;
 ${body}
 do $verify$
 declare t record;rows jsonb;bundle jsonb:='{}';saved jsonb;users jsonb;before_policies jsonb;after_policies jsonb;
 begin
  select data into saved from ders_release_private.app_snapshots where version='v1.3.2-pre';
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname loop
   execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb) from public.%I x',t.relname) into rows;
   bundle:=bundle||jsonb_build_object(t.relname,rows);
  end loop;
  select coalesce(jsonb_agg(to_jsonb(u) order by u.id),'[]') into users from auth.users u;
  if md5(bundle::text) is distinct from saved->'_checks'->>'tables_hash' or md5(users::text) is distinct from saved->'_checks'->>'auth_hash' then raise exception 'User data preservation check failed; rolling back';end if;
  select coalesce(jsonb_agg(p order by p->>'schemaname',p->>'tablename',p->>'policyname'),'[]') into before_policies from jsonb_array_elements(saved->'policies')p where not(p->>'schemaname'='public' and p->>'tablename'='quest_board_states' and p->>'policyname' in('Users can read their quest board','Users can insert their quest board','Users can update their quest board'));
  select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') into after_policies from pg_policies p where(schemaname='public' or schemaname like 'ders%') and not(schemaname='public' and tablename='quest_board_states' and policyname in('Users can read their quest board','Users can insert their quest board','Users can update their quest board'));
  if before_policies is distinct from after_policies then raise exception 'Unrelated RLS changed; rolling back';end if;
  if has_function_privilege('anon','public.ders_history(text,jsonb)','EXECUTE') or has_table_privilege('authenticated','public.study_history_hidden','DELETE') then raise exception 'History permissions are too broad';end if;
 end $verify$; commit;`;
};
if(require.main===module)process.stdout.write(module.exports());
