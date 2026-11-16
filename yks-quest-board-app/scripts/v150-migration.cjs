'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=(file='20261115165626_v150_class_correctness.sql')=>{
 if(!/^\d{14}_v150_[a-z_]+\.sql$/.test(file))throw Error('Unexpected v150 migration');
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8');
 const m2=file.endsWith('_v150_class_sections.sql'),tag=m2?'1.5.0-M2':'1.5.0-M1';
 return `begin;
set local lock_timeout='5s';
do $guard$ begin
 ${m2?"if to_regclass('ders_class_private.membership_periods') is null or to_regprocedure('ders_class_private.view(uuid,jsonb)') is not null then raise exception 'Expected M1 without M2; inspect schema';end if;":"if to_regclass('ders_class_private.membership_periods') is not null then raise exception 'v150 M1 is already installed; inspect schema before retry';end if;"}
 if to_regclass('ders_release_private.app_snapshots') is null then raise exception 'Existing closed backup storage required';end if;
end $guard$;
create or replace function ders_release_private.v150_fingerprint() returns jsonb language plpgsql security definer set search_path='' as $f$
declare t record;v text;result jsonb:='{}';begin
 for t in select schemaname,tablename from pg_tables where schemaname='public' or schemaname='auth' and tablename='users' order by 1,2 loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,''|'' order by to_jsonb(r)::text),'''')) from %I.%I r',t.schemaname,t.tablename) into v;
  result:=result||jsonb_build_object(t.schemaname||'.'||t.tablename,v);
 end loop;
 return result||jsonb_build_object('_policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]') from pg_policies p where schemaname='public'));
end $f$;
revoke all on function ders_release_private.v150_fingerprint() from public,anon,authenticated;
create temporary table v150_before on commit drop as select ders_release_private.v150_fingerprint() data;
alter table v150_before enable row level security;
do $backup$ declare t record;rows jsonb;snapshot jsonb:='{}';begin
 for t in select schemaname,tablename from pg_tables where schemaname='public' or schemaname='auth' and tablename='users' order by 1,2 loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I.%I r',t.schemaname,t.tablename) into rows;
  snapshot:=snapshot||jsonb_build_object(t.schemaname||'.'||t.tablename,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('${tag}',snapshot||jsonb_build_object('_checks',(select b.data from v150_before b),
 '_functions',(select jsonb_object_agg(p.proname,pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ders_class_private' and p.proname in('action','detail','stats'))));
end $backup$;
${sql}
do $verify$ begin
 if ders_release_private.v150_fingerprint() is distinct from (select data from v150_before) then raise exception 'Existing rows or policies changed; rollback entire v150 migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='${tag}';
end $verify$;
commit;`;
};
if(require.main===module){const out=path.resolve(__dirname,'../test-results/v150-m1-guarded.sql');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,module.exports());console.log(out);}
