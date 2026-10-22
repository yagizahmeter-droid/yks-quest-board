const fs=require('node:fs'),path=require('node:path');
const migration='20261022171931_topic_title_change_requests.sql';
module.exports=function(){const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations',migration),'utf8');
 if(!/^begin;\s/i.test(sql)||!/commit;\s*$/i.test(sql))throw Error('Expected reviewed atomic patch');
 return sql.replace(/^begin;\s/i,()=>`begin;
set local lock_timeout='5s';
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='teacher_assigned_quests' and column_name='custom_title')
 then raise exception 'Patch already present; inspect migration history instead of reapplying'; end if;
 if to_regprocedure('ders_learning_private.notify(uuid,text,text,uuid,uuid,text,text,uuid)') is null
 then raise exception 'Required learning notification infrastructure is absent'; end if;
end $$;
create or replace function ders_release_private.v1141_fingerprint() returns jsonb
language plpgsql security definer set search_path='' as $$
declare t record; n bigint; digest text; result jsonb:='{}';
begin
 for t in select c.oid,ns.nspname,c.relname,c.relacl,c.relrowsecurity
  from pg_catalog.pg_class c join pg_catalog.pg_namespace ns on ns.oid=c.relnamespace
  where c.relkind='r' and ((ns.nspname='public' and c.relname=any(array['quest_board_states','user_profiles','student_teacher_connections',
   'teacher_plan_assignments','teacher_assigned_quests','quest_change_requests','quest_completion_events','ders_admin_notes','ders_admin_events',
   'study_segments','task_messages','week_reviews','notification_preferences','learning_notifications']))
   or (ns.nspname='auth' and c.relname in('users','identities')) or (ns.nspname='ders_admin_private' and c.relname='members')
   or (ns.nspname='ders_private' and c.relname in('board_backups','invite_attempts','teacher_invite_codes','teacher_update_backups')))
  order by ns.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(string_agg(row_data,'''' order by row_data),'''')) from (select (to_jsonb(x)%s)::text row_data from %I.%I x) q',
   case when t.nspname='public' and t.relname='teacher_assigned_quests' then ' - ''custom_title''' else '' end,t.nspname,t.relname) into n,digest;
  result:=result||jsonb_build_object(t.nspname||'.'||t.relname,jsonb_build_object('count',n,'hash',digest,'acl',t.relacl,'rls',t.relrowsecurity,
   'columns',(select md5(coalesce(string_agg(a.attname||':'||a.atttypid||':'||a.attnotnull,',' order by a.attnum),'')) from pg_catalog.pg_attribute a
    where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped and not(t.nspname='public' and t.relname='teacher_assigned_quests' and a.attname='custom_title')),
   'policies',(select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by p.policyname),'')) from pg_catalog.pg_policies p where p.schemaname=t.nspname and p.tablename=t.relname)));
 end loop;
 return result||jsonb_build_object('_unchanged_functions',(select md5(coalesce(string_agg(pg_catalog.pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''),'' order by p.oid),''))
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace ns on ns.oid=p.pronamespace
  where ns.nspname in('public','ders_private','ders_admin_private','ders_learning_private') and p.prokind='f'
   and not(ns.nspname='ders_private' and p.proname in('action','action_before_title_requests','derive_topic_title')) and not(ns.nspname='public' and p.proname='ders_action')));
end $$;
revoke all on function ders_release_private.v1141_fingerprint() from public,anon,authenticated;
do $$ declare t record; snapshot jsonb:='{}'; rows jsonb; begin
 for t in select key from jsonb_each(ders_release_private.v1141_fingerprint()) where key not like '\\_%' order by key loop
  execute format('lock table %s in share mode',t.key);
 end loop;
 for t in select key from jsonb_each(ders_release_private.v1141_fingerprint()) where key not like '\\_%' and key not like 'auth.%' order by key loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from %s x',t.key) into rows;
  snapshot:=snapshot||jsonb_build_object(t.key,rows);
 end loop;
 snapshot:=snapshot||jsonb_build_object('_checks',ders_release_private.v1141_fingerprint(),'_previous_functions',(
  select jsonb_object_agg(ns.nspname||'.'||p.proname,pg_catalog.pg_get_functiondef(p.oid)) from pg_catalog.pg_proc p join pg_catalog.pg_namespace ns on ns.oid=p.pronamespace
  where ns.nspname='ders_private' and p.proname in('action','derive_topic_title') or ns.nspname='public' and p.proname='ders_action'));
 insert into ders_release_private.app_snapshots(version,data) values('1.1.4.1',snapshot);
end $$;
create temporary table v1141_patch_before on commit drop as select ders_release_private.v1141_fingerprint() fingerprint;
`).replace(/commit;\s*$/i,()=>`do $$ begin
 if (select fingerprint from v1141_patch_before) is distinct from ders_release_private.v1141_fingerprint()
 then raise exception 'Existing records, accounts, grants, policies or unrelated functions changed; patch rolled back'; end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.1.4.1';
end $$;
commit;`);
};
if(require.main===module)process.stdout.write(module.exports());
