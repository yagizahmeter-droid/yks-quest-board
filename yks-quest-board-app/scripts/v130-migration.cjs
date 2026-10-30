const fs=require('node:fs'),path=require('node:path');
module.exports=()=>{
 const sql=['20261030174259_class_system_v130.sql','20261030183345_class_action_fix_v130.sql','20261030183708_class_privacy_v130.sql','20261030184941_class_history_access_v130.sql'].map(file=>fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'')).join('\n');
 return `begin;
do $guard$ begin
 if to_regclass('public.school_classes') is not null then raise exception 'Sınıf sistemi zaten kurulu; tekrar uygulamadan şemayı incele.';end if;
 if to_regclass('ders_release_private.app_snapshots') is null or to_regclass('public.practice_exams') is null then raise exception 'Önce mevcut production sürümünü doğrula.';end if;
end $guard$;
create function ders_release_private.v130_fingerprint() returns jsonb language plpgsql security definer set search_path='' as $fp$
declare t record;data_hash text;result jsonb:='{}';begin
 for t in select schemaname,tablename from pg_tables where (schemaname='public' and tablename not like 'class_%' and tablename<>'school_classes') or schemaname='auth' and tablename='users' order by 1,2 loop
  execute format('select md5(coalesce(string_agg(to_jsonb(r)::text,''|'' order by to_jsonb(r)::text),'''')) from %I.%I r',t.schemaname,t.tablename) into data_hash;
  result:=result||jsonb_build_object(t.schemaname||'.'||t.tablename,data_hash);
 end loop;
 result:=result||jsonb_build_object('_policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname),'[]') from pg_policies p where schemaname='public' and tablename not like 'class_%' and tablename<>'school_classes'));
 return result;end $fp$;
revoke all on function ders_release_private.v130_fingerprint() from public,anon,authenticated;
create temporary table v130_before on commit drop as select ders_release_private.v130_fingerprint() value;
alter table v130_before enable row level security;
do $backup$ declare t record;data jsonb:='{}';rows jsonb;begin
 for t in select schemaname,tablename from pg_tables where schemaname='public' or schemaname='auth' and tablename='users' order by 1,2 loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I.%I r',t.schemaname,t.tablename) into rows;
  data:=data||jsonb_build_object(t.schemaname||'.'||t.tablename,rows);
 end loop;
 insert into ders_release_private.app_snapshots(version,data) values('1.3.0',data||jsonb_build_object('_checks',(select value from v130_before),'_previous_action',pg_get_functiondef('ders_private.action(text,jsonb)'::regprocedure),'_scope','Additive class system. Existing rows and RLS remain unchanged.'));
end $backup$;
${sql}
do $verify$ begin
 if (select value from v130_before) is distinct from ders_release_private.v130_fingerprint() then raise exception 'Mevcut veri veya RLS değişti; bütün migration geri alındı.';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.3.0';
end $verify$;
commit;`;
};
