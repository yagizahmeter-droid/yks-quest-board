const fs=require('node:fs'),path=require('node:path');
module.exports=()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261027222603_experience_management_v121.sql'),'utf8');
 return sql.replace(/^begin;/,()=>`begin;
set local lock_timeout='5s';
do $$ begin
 if to_regclass('public.study_history_hidden') is not null then raise exception 'v1.2.1 already installed; inspect before retry';end if;
 if to_regprocedure('ders_release_private.v1141_fingerprint()') is null then raise exception 'Closed backup guard missing';end if;
end $$;
create function ders_release_private.v121_fingerprint() returns jsonb language plpgsql security definer set search_path='' as $guard$
declare t record;result jsonb:='{}';digest text;begin
 for t in select key name from jsonb_each(ders_release_private.v1141_fingerprint()) where left(key,1)<>'_'
  union select 'public.practice_exams' loop
  execute format('select md5(coalesce(jsonb_agg(x.data order by x.data::text),''[]'')::text) from (select to_jsonb(t)%s data from %s t) x',
    case when t.name in('public.teacher_plan_assignments','public.teacher_assigned_quests') then '-''archived_at''' else '' end,t.name) into digest;
  result:=result||jsonb_build_object(t.name,digest);
 end loop;
 return result||jsonb_build_object('_policies',(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]')::text) from pg_policies p where p.schemaname='public' and p.tablename<>'study_history_hidden'),
 '_columns',(select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.table_name,c.ordinal_position),'[]')::text) from information_schema.columns c where c.table_schema='public' and c.table_name<>'study_history_hidden' and not(c.table_name in('teacher_plan_assignments','teacher_assigned_quests') and c.column_name='archived_at')));
end $guard$;
revoke all on function ders_release_private.v121_fingerprint() from public,anon,authenticated;
create temporary table v121_before on commit drop as select ders_release_private.v121_fingerprint() fingerprint;
create temporary table v121_functions on commit drop as select p.oid,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in('public','ders_private','ders_admin_private','ders_learning_private') and p.prokind='f'
 and not(n.nspname in('ders_private','ders_learning_private') and p.proname='action');
alter table v121_before enable row level security;
alter table v121_functions enable row level security;
do $$ declare t record;rows jsonb;snapshot jsonb:='{}';begin
 for t in select key from jsonb_each((select fingerprint from v121_before)) where left(key,1)<>'_' order by key loop
  execute format('lock table %s in share mode',t.key);
 end loop;
 update v121_before set fingerprint=ders_release_private.v121_fingerprint();
 for t in select key from jsonb_each((select fingerprint from v121_before)) where left(key,1)<>'_' and key not like 'auth.%' order by key loop
  execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]'') from %s t',t.key) into rows;
  snapshot:=snapshot||jsonb_build_object(t.key,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('1.2.1',snapshot||jsonb_build_object('_checks',(select fingerprint from v121_before),'_scope','Additive management, history tombstones and repeat projection repair; no existing data rewritten'));
end $$;
`).replace(/commit;\s*$/,()=>`do $$ begin
 if (select fingerprint from v121_before) is distinct from ders_release_private.v121_fingerprint()
 or exists(select 1 from v121_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or f.definition is distinct from pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''))
 then raise exception 'Existing data, security or unrelated functions changed; migration rolled back';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.2.1';
end $$;
commit;`);
};
if(require.main===module)process.stdout.write(module.exports());
