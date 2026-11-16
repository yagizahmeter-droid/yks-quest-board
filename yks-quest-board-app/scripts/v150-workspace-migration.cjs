'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=(milestone='M3')=>{const spec={M3:{file:'20261115174523_v150_workspace.sql',guard:"to_regprocedure('ders_class_private.view(uuid,jsonb)') is null or to_regclass('public.teacher_workspace_drafts') is not null"},M4:{file:'20261115193156_v150_teacher_tools.sql',guard:"to_regclass('public.teacher_workspace_drafts') is null or to_regclass('public.teacher_program_templates') is not null"},M5:{file:'20261115211500_v150_teacher_analysis.sql',guard:"to_regclass('public.teacher_program_templates') is null or to_regprocedure('ders_workspace_private.analysis(uuid,jsonb)') is not null"},M6:{file:'20261116001000_v150_scheduling.sql',guard:"to_regprocedure('ders_workspace_private.analysis(uuid,jsonb)') is null or to_regclass('public.teacher_scheduled_programs') is not null"},M7:{file:'20261116012500_v150_teacher_actions.sql',guard:"to_regclass('public.teacher_scheduled_programs') is null or to_regprocedure('ders_workspace_private.action_center(uuid)') is not null"}}[milestone];if(!spec)throw Error('Unknown workspace milestone');return `begin;
set local lock_timeout='5s';
do $guard$ begin
 if ${spec.guard} then raise exception 'Unexpected workspace schema; inspect before migration';end if;
end $guard$;
create temporary table v150_workspace_tables on commit drop as select schemaname,tablename from pg_tables where schemaname='public' or schemaname='auth' and tablename='users';
alter table v150_workspace_tables enable row level security;
create or replace function pg_temp.v150_workspace_fingerprint() returns jsonb language plpgsql set search_path='' as $f$
declare t record;digest text;result jsonb:='{}';begin
 for t in select * from pg_temp.v150_workspace_tables order by schemaname,tablename loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,''|'' order by to_jsonb(r)::text),'''')) from %I.%I r',t.schemaname,t.tablename) into digest;
  result:=result||jsonb_build_object(t.schemaname||'.'||t.tablename,digest);
 end loop;
 return result||jsonb_build_object('_policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]') from pg_policies p join pg_temp.v150_workspace_tables t using(schemaname,tablename)));
end $f$;
create temporary table v150_workspace_before on commit drop as select pg_temp.v150_workspace_fingerprint() data;
alter table v150_workspace_before enable row level security;
do $backup$ declare t record;rows jsonb;snapshot jsonb:='{}';begin
 for t in select * from pg_temp.v150_workspace_tables loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I.%I r',t.schemaname,t.tablename) into rows;
  snapshot:=snapshot||jsonb_build_object(t.schemaname||'.'||t.tablename,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-${milestone}',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
${fs.readFileSync(path.join(__dirname,'../supabase/migrations',spec.file),'utf8')}
do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-${milestone}';
end $verify$;
commit;`;};
