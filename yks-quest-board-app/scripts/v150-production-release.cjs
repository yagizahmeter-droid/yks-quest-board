'use strict';
// Reviewed additive release. Backups never leave the existing private schema.
const m12=require('./v150-migration.cjs'),workspace=require('./v150-workspace-migration.cjs');
const schemaHashSQL=`select md5(string_agg(v,'|' order by v)) from (select to_jsonb(c)::text v from information_schema.columns c where c.table_schema='public' union all select to_jsonb(p)::text from pg_policies p where schemaname='public' union all select n.nspname||c.relname||pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' union all select indexdef from pg_indexes where schemaname='public') definitions`;
const preflightSQL=`select jsonb_build_object('schema_hash',(${schemaHashSQL}),'functions',(select jsonb_object_agg(p.proname,md5(pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ders_class_private' and p.proname in('action','detail','stats'))) as checks`;
function release({schemaHash,functions,enableCron=true}){
 if(!/^[a-f0-9]{32}$/.test(schemaHash)||!['action','detail','stats'].every(k=>/^[a-f0-9]{32}$/.test(functions?.[k]||'')))throw Error('Verified schema and original function hashes required');
 let sql=`begin;
set transaction isolation level repeatable read;
set local lock_timeout='5s';
do $preflight$ begin
 if (${schemaHashSQL})<>'${schemaHash}' then raise exception 'Production schema changed after review; release stopped';end if;
 if to_regclass('ders_class_private.membership_periods') is not null or to_regclass('public.teacher_workspace_drafts') is not null or to_regclass('public.teacher_scheduled_programs') is not null then raise exception 'Expected pre-v150 schema; do not reinstall';end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ders_release_private' and c.relname='app_snapshots' and c.relrowsecurity) or has_table_privilege('anon','ders_release_private.app_snapshots','SELECT') or has_table_privilege('authenticated','ders_release_private.app_snapshots','SELECT') then raise exception 'Closed RLS-protected backup storage required';end if;
 ${['action','detail','stats'].map(name=>`if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ders_class_private' and p.proname='${name}') is distinct from '${functions[name]}' then raise exception 'Unexpected original ${name} function';end if;`).join('\n ')}
 if exists(select 1 from ders_release_private.app_snapshots where version like '1.5.0%') then raise exception 'v150 snapshot exists; inspect before retry';end if;
end $preflight$;
create temporary table v150_release_tables on commit drop as select schemaname,tablename from pg_tables where schemaname='public' or schemaname='auth' and tablename='users';
alter table v150_release_tables enable row level security;
create function pg_temp.v150_release_fingerprint() returns jsonb language plpgsql set search_path='' as $f$
declare t record;digest text;data jsonb:='{}';begin
 for t in select * from pg_temp.v150_release_tables order by schemaname,tablename loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,''|'' order by to_jsonb(r)::text),'''')) from %I.%I r',t.schemaname,t.tablename) into digest;
  data:=data||jsonb_build_object(t.schemaname||'.'||t.tablename,digest);
 end loop;
 return data||jsonb_build_object('_policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname),'[]') from pg_policies p join pg_temp.v150_release_tables t using(schemaname,tablename)));
end $f$;
create temporary table v150_release_before on commit drop as select pg_temp.v150_release_fingerprint() data;
alter table v150_release_before enable row level security;
do $closed_backup$ declare t record;rows jsonb;snapshot jsonb:='{}';begin
 for t in select * from pg_temp.v150_release_tables loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I.%I r',t.schemaname,t.tablename) into rows;
  snapshot:=snapshot||jsonb_build_object(t.schemaname||'.'||t.tablename,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-pre',snapshot||jsonb_build_object('_checks',(select data from pg_temp.v150_release_before),'_schema_hash','${schemaHash}',
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_functiondef(p.oid)),'{}') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind in('f','p') and n.nspname in('public','ders_private','ders_class_private','ders_learning_private','ders_exams_private','ders_admin_private','ders_release_private')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl)),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind in('f','p') and n.nspname in('public','ders_private','ders_class_private','ders_learning_private','ders_exams_private','ders_admin_private','ders_release_private')),
 '_indexes',(select jsonb_agg(to_jsonb(i)) from pg_indexes i where schemaname='public'),
 '_table_acl',(select jsonb_agg(jsonb_build_object('table',c.relname,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
 '_scope','Atomic v1.5.0 release; original public/auth rows and old RLS must remain unchanged'));
end $closed_backup$;
`;
 const unwrap=s=>s.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
 for(const [name,file] of [['M1',undefined],['M2','20261115171405_v150_class_sections.sql']])sql+='\n-- '+name+'\n'+unwrap(m12(file))+'\ndrop table pg_temp.v150_before;\n';
 for(const step of ['M3','M4','M5','M6','M7']){
  if(step==='M6'&&enableCron)sql+=`\ndo $native_cron$ begin if not exists(select 1 from pg_available_extensions where name='pg_cron') then raise exception 'Required native Cron unavailable';end if;end $native_cron$;\ncreate extension if not exists pg_cron with schema pg_catalog;\ngrant usage on schema cron to postgres;\ngrant all privileges on all tables in schema cron to postgres;\n`;
  sql+='\n-- '+step+'\n'+unwrap(workspace(step))+'\ndrop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;\n';
 }
 sql+=`\ndo $release_verify$ begin
 if pg_temp.v150_release_fingerprint() is distinct from (select data from pg_temp.v150_release_before) then raise exception 'Original user data or RLS changed; rollback complete release';end if;
 if exists(select 1 from jsonb_array_elements((select data->'_indexes' from ders_release_private.app_snapshots where version='1.5.0-pre')) i where not exists(select 1 from pg_indexes p where to_jsonb(p)=i)) then raise exception 'Original index changed; rollback';end if;
 if (select count(*) from ders_release_private.app_snapshots where version in('1.5.0-M1','1.5.0-M2','1.5.0-M3','1.5.0-M4','1.5.0-M5','1.5.0-M6','1.5.0-M7') and data->>'_validated'='true')<>7 then raise exception 'Incomplete milestone validation';end if;
 if has_function_privilege('anon','ders_workspace_private.run_due(integer)','EXECUTE') or has_function_privilege('authenticated','ders_workspace_private.run_due(integer)','EXECUTE') then raise exception 'Worker accessible to clients';end if;
 ${enableCron?"if not ders_workspace_private.scheduler_active() then raise exception 'Native scheduler activation failed';end if;":''}
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true,'_completed_at',now()) where version='1.5.0-pre';
end $release_verify$;
commit;
select jsonb_build_object('preserved',true,'milestones',(select jsonb_agg(jsonb_build_object('version',version,'validated',data->>'_validated') order by version) from ders_release_private.app_snapshots where version like '1.5.0%'),'scheduler_active',ders_workspace_private.scheduler_active(),'worker_client_access',false) as release_result;`;
 return sql;
}
module.exports=release;module.exports.preflightSQL=preflightSQL;
