const fs=require('node:fs'),path=require('node:path');
module.exports=function(){
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261027175752_practice_exams_v120.sql'),'utf8');
 if(!/^begin;/i.test(sql)||!/commit;\s*$/i.test(sql))throw Error('Expected atomic migration');
 return sql.replace(/^begin;/i,()=>`begin;
set local lock_timeout='5s';
do $$ begin
 if to_regclass('public.practice_exams') is not null then raise exception 'Exam schema already exists; inspect before reapplying';end if;
 if to_regprocedure('ders_release_private.v1141_fingerprint()') is null then raise exception 'Existing server-only backup guard is missing';end if;
end $$;
create temporary table v120_before on commit drop as select ders_release_private.v1141_fingerprint()-'_unchanged_functions' fingerprint;
create temporary table v120_functions on commit drop as
 select p.oid,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in('public','ders_private','ders_admin_private','ders_learning_private') and p.prokind='f';
alter table v120_before enable row level security;
alter table v120_functions enable row level security;
do $$ declare t record; snapshot jsonb:='{}'; rows jsonb; begin
 for t in select key from jsonb_each((select fingerprint from v120_before)) where key not like '\\_%' order by key loop
  execute format('lock table %s in share mode',t.key);
 end loop;
 update v120_before set fingerprint=ders_release_private.v1141_fingerprint()-'_unchanged_functions' where fingerprint is not null;
 for t in select key from jsonb_each((select fingerprint from v120_before)) where key not like '\\_%' and key not like 'auth.%' order by key loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from %s x',t.key) into rows;
  snapshot:=snapshot||jsonb_build_object(t.key,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('1.2.0',snapshot||jsonb_build_object('_checks',(select fingerprint from v120_before),'_scope','Additive exams only; old tables and policies unchanged'));
end $$;
`).replace(/commit;\s*$/i,()=>`do $$ begin
 if (select fingerprint from v120_before) is distinct from ders_release_private.v1141_fingerprint()-'_unchanged_functions'
 or exists(select 1 from v120_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or f.definition is distinct from pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''))
 then raise exception 'Existing user records, functions or policies changed; release rolled back';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.2.0';
end $$;
commit;`);
};
if(require.main===module)process.stdout.write(module.exports());
