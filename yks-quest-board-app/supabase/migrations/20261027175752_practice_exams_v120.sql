begin;
create schema if not exists ders_exams_private;
revoke all on schema ders_exams_private from public, anon, authenticated;
grant usage on schema ders_exams_private to authenticated;

create table public.practice_exams (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 exam_type text not null check(exam_type in ('TYT','AYT')),
 name text not null check(length(btrim(name)) between 1 and 160),
 exam_date date not null check(exam_date between date '1900-01-01' and date '2200-12-31'),
 publisher text not null default '' check(length(publisher)<=160),
 note text not null default '' check(length(note)<=2000),
 groups jsonb not null, results jsonb not null,
 total_net numeric(7,2), maximum integer not null, is_partial boolean not null,
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,id)
);
create index practice_exams_owner_type_date on public.practice_exams(user_id,exam_type,exam_date desc,created_at desc);
alter table public.practice_exams enable row level security;
revoke all on public.practice_exams from public,anon,authenticated;
grant select,insert,update,delete on public.practice_exams to authenticated;
create policy exam_read on public.practice_exams for select to authenticated
 using(ders_learning_private.can_read(user_id));
create policy exam_insert on public.practice_exams for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='student'));
create policy exam_update on public.practice_exams for update to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='student'))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='student'));
create policy exam_delete on public.practice_exams for delete to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='student'));

create function ders_exams_private.validate_record() returns trigger
language plpgsql security invoker set search_path='' as $$
declare g jsonb; gid text; mode text; seen text[]:='{}'; limits jsonb:='{}'; parts jsonb;
 entry record; v jsonb; k text; n integer; total integer; filled integer; has_value boolean:=false;
 net numeric:=0; scored boolean:=false; complete boolean:=true; max_total integer:=0;
begin
 if jsonb_typeof(new.groups) is distinct from 'array' or jsonb_array_length(new.groups) not between 1 and 4
 or jsonb_typeof(new.results) is distinct from 'object' then raise exception 'Geçersiz test seçimi veya sonuçlar.';end if;
 for g in select * from jsonb_array_elements(new.groups) loop
  gid:=g->>'id';mode:=g->>'mode';
  if gid is null or gid=any(seen) or mode is null or mode not in ('total','detail') or (new.exam_type='AYT' and mode<>'detail') then raise exception 'Geçersiz veya yinelenen test seçimi.';end if;
  seen:=array_append(seen,gid);
  if new.exam_type='TYT' then
   parts:=case gid when 'turkish' then '{"turkish":40}' when 'math' then '{"math":40}'
    when 'social' then '{"history":5,"geography":5,"philosophy":5,"religion":5}'
    when 'science' then '{"physics":7,"chemistry":7,"biology":6}' else null end;
  else
   parts:=case gid when 'math' then '{"math":40}' when 'science' then '{"physics":14,"chemistry":13,"biology":13}'
    when 'literature' then '{"literature":24,"history1":10,"geography1":6}'
    when 'social2' then '{"history2":11,"geography2":11,"philosophy":12,"religion":6}' else null end;
  end if;
  if parts is null then raise exception 'Sınav ve test uyuşmuyor.';end if;
  if mode='total' then select jsonb_build_object(gid,sum(value::integer)) into parts from jsonb_each_text(parts);end if;
  limits:=limits||parts;
 end loop;
 if exists(select 1 from jsonb_object_keys(new.results) key where not limits ? key) then raise exception 'Seçilmeyen test sonuçları hesaplanamaz.';end if;
 for entry in select key,value::integer as maximum from jsonb_each_text(limits) loop
  v:=coalesce(new.results->entry.key,'{}');total:=0;filled:=0;max_total:=max_total+entry.maximum;
  if jsonb_typeof(v) is distinct from 'object' or exists(select 1 from jsonb_object_keys(v) key where key not in ('correct','wrong','blank')) then raise exception 'Geçersiz soru bilgisi.';end if;
  foreach k in array array['correct','wrong','blank'] loop
   if v ? k and v->k<>'null'::jsonb then
    if jsonb_typeof(v->k)<>'number' or (v->>k)!~'^[0-9]+$' or length(v->>k)>3 then raise exception 'Soru adedi negatif veya ondalıklı olamaz.';end if;
    n:=(v->>k)::integer;
    if n>entry.maximum then raise exception 'Soru adedi test sınırını aşıyor.';end if;
    total:=total+n;filled:=filled+1;has_value:=true;
   end if;
  end loop;
  if total>entry.maximum or (filled=3 and total<>entry.maximum) then raise exception 'Doğru, yanlış ve boş toplamı testin soru sayısıyla uyuşmuyor.';end if;
  if filled<>3 then complete:=false;end if;
  if v->>'correct' is not null and v->>'wrong' is not null then net:=net+(v->>'correct')::numeric-(v->>'wrong')::numeric/4;scored:=true;end if;
 end loop;
 if not has_value then raise exception 'En az bir soru adedi gir.';end if;
 new.total_net:=case when scored then net else null end;new.maximum:=max_total;new.is_partial:=not complete;
 new.name:=btrim(new.name);
 if tg_op='UPDATE' then
  if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Kayıt sahipliği değiştirilemez.';end if;
  new.created_at:=old.created_at;new.revision:=old.revision+1;
 else new.created_at:=clock_timestamp();new.revision:=1;
 end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function ders_exams_private.validate_record() from public,anon,authenticated;
create trigger practice_exam_validation before insert or update on public.practice_exams
 for each row execute function ders_exams_private.validate_record();

create function public.ders_exams(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid;eid uuid;old public.practice_exams%rowtype;outrow public.practice_exams%rowtype;
begin
 if uid is null then raise exception 'Önce hesabına giriş yap.' using errcode='42501';end if;
 if p_payload ? 'request_user_id' and p_payload->>'request_user_id'<>uid::text then raise exception 'Oturum değişti.' using errcode='42501';end if;
 if p_action='list' then
  sid:=coalesce((p_payload->>'student_id')::uuid,uid);
  if not ders_learning_private.can_read(sid) then raise exception 'Bu öğrencinin denemelerine erişim yetkin yok.' using errcode='42501';end if;
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.exam_date,e.created_at,e.id) from public.practice_exams e where e.user_id=sid),'[]');
 end if;
 if not exists(select 1 from public.user_profiles p where p.id=uid and p.role='student') then raise exception 'Denemeleri yalnızca sahibi olan öğrenci değiştirebilir.' using errcode='42501';end if;
 if p_payload ? 'user_id' and p_payload->>'user_id'<>uid::text then raise exception 'Kayıt sahipliği değiştirilemez.' using errcode='42501';end if;
 eid:=(p_payload->>'id')::uuid;
 if eid is null then raise exception 'Kayıt kimliği gerekli.';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||eid::text,120));
 select * into old from public.practice_exams where user_id=uid and id=eid for update;
 if p_action='delete' then
  if old.id is null then return jsonb_build_object('deleted',true);end if;
  if old.revision<>(p_payload->>'revision')::integer or p_payload->>'revision' is null then raise exception 'Kayıt başka cihazda değişti. Yenile ve yeniden dene.' using errcode='40001';end if;
  delete from public.practice_exams where user_id=uid and id=eid;return jsonb_build_object('deleted',true);
 elsif p_action='save' then
  if old.id is not null then
   if old.exam_type=p_payload->>'exam_type' and old.name=btrim(p_payload->>'name') and old.exam_date=(p_payload->>'exam_date')::date
    and old.publisher=coalesce(p_payload->>'publisher','') and old.note=coalesce(p_payload->>'note','') and old.groups=p_payload->'groups' and old.results=p_payload->'results' then return to_jsonb(old);end if;
   if old.revision<>(p_payload->>'revision')::integer or p_payload->>'revision' is null then raise exception 'Kayıt başka cihazda değişti. Yenile ve yeniden dene; formun korunuyor.' using errcode='40001';end if;
   update public.practice_exams set exam_type=p_payload->>'exam_type',name=p_payload->>'name',exam_date=(p_payload->>'exam_date')::date,
    publisher=coalesce(p_payload->>'publisher',''),note=coalesce(p_payload->>'note',''),groups=p_payload->'groups',results=p_payload->'results'
    where user_id=uid and id=eid returning * into outrow;
  else
   if coalesce((p_payload->>'revision')::integer,0)<>0 then raise exception 'Kayıt silinmiş olabilir. Formun korunuyor.' using errcode='40001';end if;
   insert into public.practice_exams(user_id,id,exam_type,name,exam_date,publisher,note,groups,results)
    values(uid,eid,p_payload->>'exam_type',p_payload->>'name',(p_payload->>'exam_date')::date,coalesce(p_payload->>'publisher',''),coalesce(p_payload->>'note',''),p_payload->'groups',p_payload->'results') returning * into outrow;
  end if;
  return to_jsonb(outrow);
 end if;
 raise exception 'Bilinmeyen deneme işlemi.';
end $$;
revoke all on function public.ders_exams(text,jsonb) from public,anon;
grant execute on function public.ders_exams(text,jsonb) to authenticated;
commit;
