-- D.E.R.S. v1.5.0: STAGING ONLY hswipswqulolcwqvcjvi. NEVER production jswgagzbetwviamiwcck.
-- Atomic installation of M3–M7 on the previously verified M2 staging schema.
-- Existing rows and RLS are fingerprinted after every milestone. Backups stay server-only.
begin;
set local lock_timeout='5s';
do $staging$ begin
 if not exists(select 1 from ders_release_private.app_snapshots where version='1.5.0-M2' and data->>'_validated'='true')
 or to_regclass('public.teacher_workspace_drafts') is not null then raise exception 'Expected verified M2-only staging. Stop and inspect; no change applied.';end if;
end $staging$;

-- M3
set local lock_timeout='5s';
do $guard$ begin
 if to_regprocedure('ders_class_private.view(uuid,jsonb)') is null or to_regclass('public.teacher_workspace_drafts') is not null then raise exception 'Unexpected workspace schema; inspect before migration';end if;
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
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-M3',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
-- v1.5.0 workspace storage. Existing assignments, boards and XP stay in their original tables.
create schema ders_workspace_private;
revoke all on schema ders_workspace_private from public,anon;
grant usage on schema ders_workspace_private to authenticated;
create table public.teacher_workspace_drafts(
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),student_id uuid not null references public.user_profiles(id),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=200000),
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index workspace_drafts_owner_student on public.teacher_workspace_drafts(teacher_id,student_id,updated_at desc,id);
alter table public.teacher_workspace_drafts enable row level security;
revoke all on public.teacher_workspace_drafts from public,anon,authenticated;
grant select on public.teacher_workspace_drafts to authenticated;
create policy workspace_draft_owner on public.teacher_workspace_drafts for select to authenticated using(
 teacher_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='teacher') and exists(select 1 from public.student_teacher_connections c where c.teacher_id=teacher_workspace_drafts.teacher_id and c.student_id=teacher_workspace_drafts.student_id and c.status='approved')
);
create function ders_workspace_private.allowed(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.user_profiles p join public.student_teacher_connections c on c.teacher_id=p.id
  where p.id=auth.uid() and p.role='teacher' and c.student_id=sid and c.status='approved')
$$;
create function ders_workspace_private.date_value(value text) returns date language plpgsql immutable set search_path='' as $$
begin if value is null or value!~'^\d{4}-\d{2}-\d{2}$' then return null;end if;return value::date;exception when invalid_datetime_format or datetime_field_overflow then return null;end $$;
create function ders_workspace_private.week_headers(sid uuid,weeks jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg((w-'quests'-'startDate'-'endDate'-'createdAt')||jsonb_strip_nulls(jsonb_build_object(
  'startDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'startDate',w->>'start')),cp.starts_on),
  'endDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'endDate',w->>'end')),cp.ends_on),
  'createdAt',coalesce(to_jsonb(a.created_at),case when ders_workspace_private.date_value(left(w->>'createdAt',10)) is not null then w->'createdAt' end)))), '[]')
  from jsonb_array_elements(coalesce(weeks,'[]')) w
  left join public.teacher_plan_assignments a on a.week_id=w->>'id' and a.student_id=sid and a.teacher_id=auth.uid()
  left join public.class_program_recipients r on r.assignment_id=a.id left join public.class_programs cp on cp.id=r.program_id
  where ders_workspace_private.allowed(sid)
$$;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid:=(p->>'student_id')::uuid;did uuid:=(p->>'id')::uuid;item public.teacher_workspace_drafts%rowtype;result jsonb;data jsonb;draft_body jsonb;headers jsonb;wid text;
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabıyla giriş gerekli.' using errcode='42501';end if;
 if p_action='students' then return coalesce((select jsonb_agg(jsonb_build_object('id',c.student_id,'name',u.display_name) order by u.display_name,c.student_id) from public.student_teacher_connections c join public.user_profiles u on u.id=c.student_id where c.teacher_id=uid and c.status='approved'),'[]');end if;
 if not ders_workspace_private.allowed(sid) then raise exception 'Bu öğrenciyle onaylı bağlantı gerekli.' using errcode='42501';end if;
 if p_action='student' then
  data:=public.ders_action('student_board',jsonb_build_object('student_id',sid));
  headers:=ders_workspace_private.week_headers(sid,data->'state'->'weeks');
  select w->>'id' into wid from jsonb_array_elements(headers) w
   order by (w->>'id'=p->>'week_id') desc nulls last,coalesce(ders_workspace_private.date_value(w->>'startDate'),ders_workspace_private.date_value(left(w->>'createdAt',10))) desc nulls last,w->>'createdAt' desc nulls last,w->>'id' limit 1;
  return jsonb_build_object('student_id',sid,'name',(select display_name from public.user_profiles where id=sid),'categories',coalesce(data->'state'->'categories','[]'),
   'weeks',headers,
   'week',(select w||(select h from jsonb_array_elements(headers) h where h->>'id'=wid limit 1) from jsonb_array_elements(coalesce(data->'state'->'weeks','[]')) w where w->>'id'=wid limit 1),
   'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'week_id',a.week_id,'week_name',a.week_name,'week_range',a.week_range,'status',a.status,'archived_at',a.archived_at) order by a.created_at desc),'[]') from public.teacher_plan_assignments a where a.teacher_id=uid and a.student_id=sid),
   'xpBreakdown',data->'xpBreakdown');
 elsif p_action='drafts' then return coalesce((select jsonb_agg(d order by d.updated_at desc) from public.teacher_workspace_drafts d where d.teacher_id=uid and d.student_id=sid),'[]');
 elsif p_action='save_draft' then
  if did is null or jsonb_typeof(p->'body') is distinct from 'object' or jsonb_typeof(p->'body'->'quests') is distinct from 'array' or jsonb_array_length(p->'body'->'quests')>200 or octet_length((p->'body')::text)>200000 then raise exception 'Taslak en fazla 200 görev içerebilir.' using errcode='22023';end if;
  draft_body:=jsonb_build_object('name',left(coalesce(p->'body'->>'name',''),200),'start',p->'body'->>'start','end',p->'body'->>'end','quests',p->'body'->'quests');
  perform pg_advisory_xact_lock(hashtextextended(did::text,150));select * into item from public.teacher_workspace_drafts where id=did for update;
  if found then
   if item.teacher_id<>uid or item.student_id<>sid then raise exception 'Taslağa erişim yok.' using errcode='42501';end if;
   if item.body=draft_body then return to_jsonb(item);end if;
   if item.revision is distinct from (p->>'revision')::integer then return jsonb_build_object('error','Bu taslak başka bir cihazda değişti. Açık metnin korundu; güncel kopyayı ayrı taslak olarak açabilirsin.','code','draft_conflict','current_revision',item.revision);end if;
   update public.teacher_workspace_drafts set body=draft_body,revision=revision+1,updated_at=now() where id=did returning * into item;
  else
   if coalesce((p->>'revision')::integer,0)<>0 then raise exception 'Taslak bulunamadı. Açık taslağı yeni kopya olarak kaydet.';end if;
   insert into public.teacher_workspace_drafts(id,teacher_id,student_id,body) values(did,uid,sid,draft_body) returning * into item;
  end if;
  return to_jsonb(item);
 elsif p_action='delete_draft' then
  select * into item from public.teacher_workspace_drafts where id=did and teacher_id=uid and student_id=sid for update;
  if not found then return jsonb_build_object('ok',true,'idempotent',true);end if;
  if item.revision is distinct from (p->>'revision')::integer then return jsonb_build_object('error','Taslak başka bir cihazda değişti. Silinmedi.','code','draft_conflict');end if;
  delete from public.teacher_workspace_drafts where id=did;return jsonb_build_object('ok',true);
 end if;
 raise exception 'Desteklenmeyen çalışma alanı işlemi.' using errcode='22023';
end $$;
revoke all on function ders_workspace_private.allowed(uuid),ders_workspace_private.date_value(text),ders_workspace_private.week_headers(uuid,jsonb),ders_workspace_private.action(text,jsonb) from public,anon,authenticated;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
create function public.ders_workspace(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ders_workspace_private.action(p_action,p_payload)$$;
revoke all on function public.ders_workspace(text,jsonb) from public,anon;
grant execute on function public.ders_workspace(text,jsonb) to authenticated;
notify pgrst,'reload schema';

do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-M3';
end $verify$;

drop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;

-- M4
set local lock_timeout='5s';
do $guard$ begin
 if to_regclass('public.teacher_workspace_drafts') is null or to_regclass('public.teacher_program_templates') is not null then raise exception 'Unexpected workspace schema; inspect before migration';end if;
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
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-M4',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
create table public.teacher_program_templates(
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),name text not null check(length(btrim(name)) between 1 and 120),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=200000),favorite boolean not null default false,
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index teacher_templates_page on public.teacher_program_templates(teacher_id,favorite desc,updated_at desc,id);
create table public.teacher_program_dispatches(
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),body jsonb not null,
 status text not null check(status in('sending','sent','partial_failed','failed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index teacher_dispatch_owner on public.teacher_program_dispatches(teacher_id,created_at desc,id);
create table public.teacher_program_receipts(
 dispatch_id uuid not null references public.teacher_program_dispatches(id),student_id uuid not null references public.user_profiles(id),
 assignment_id uuid unique references public.teacher_plan_assignments(id),status text not null check(status in('sent','failed')),error text,
 attempts integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(dispatch_id,student_id)
);
create index teacher_receipt_student on public.teacher_program_receipts(student_id,created_at desc);
do $rls$ declare tab text;begin
 foreach tab in array array['teacher_program_templates','teacher_program_dispatches','teacher_program_receipts'] loop
  execute format('alter table public.%I enable row level security',tab);execute format('revoke all on public.%I from public,anon,authenticated',tab);execute format('grant select on public.%I to authenticated',tab);
 end loop;
end $rls$;
create policy teacher_template_owner on public.teacher_program_templates for select to authenticated using(teacher_id=(select auth.uid()) and exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='teacher'));
create policy teacher_dispatch_owner on public.teacher_program_dispatches for select to authenticated using(teacher_id=(select auth.uid()) and exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='teacher'));
create policy teacher_receipt_owner on public.teacher_program_receipts for select to authenticated using(exists(select 1 from public.teacher_program_dispatches d where d.id=dispatch_id and d.teacher_id=(select auth.uid())));
create table ders_workspace_private.reminders(assignment_id uuid primary key references public.teacher_plan_assignments(id),sent_at timestamptz not null default now());
alter table ders_workspace_private.reminders enable row level security;
revoke all on ders_workspace_private.reminders from public,anon,authenticated;

create function ders_workspace_private.dispatch_result(did uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',d.id,'status',d.status,'results',(select coalesce(jsonb_agg(jsonb_build_object('student_id',r.student_id,'status',r.status,'assignment_id',r.assignment_id,'error',r.error,'attempts',r.attempts) order by r.student_id),'[]') from public.teacher_program_receipts r where r.dispatch_id=d.id))
 from public.teacher_program_dispatches d where d.id=did and d.teacher_id=auth.uid()
$$;
create function ders_workspace_private.dispatch(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();did uuid:=(p->>'id')::uuid;cid uuid:=nullif(p->>'class_id','')::uuid;doc jsonb;batch public.teacher_program_dispatches%rowtype;receipt public.teacher_program_receipts%rowtype;sid uuid;aid uuid;answer jsonb;error_message text;first_day date;last_day date;sent integer;failed integer;existing_batch boolean;
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
 first_day:=ders_workspace_private.date_value(p->>'starts_on');last_day:=ders_workspace_private.date_value(p->>'ends_on');
 if did is null or length(btrim(coalesce(p->>'week_name',''))) not between 1 and 120 or first_day is null or last_day is null or last_day<first_day or jsonb_typeof(p->'quests') is distinct from 'array' or jsonb_array_length(p->'quests') not between 1 and 200 or jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 1 and 200 then raise exception 'Program adı, geçerli tarihler, görevler ve alıcılar gerekli.' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p->'quests') q where nullif(btrim(q->>'category'),'') is null or nullif(btrim(q->>'title'),'') is null or q->>'xp' is null or (q->>'xp')::numeric not between 5 and 10000 or (q->>'xp')::numeric<>trunc((q->>'xp')::numeric)) then raise exception 'Her görevin ders, konu ve geçerli XP alanı gerekli.' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p->'quests') q where q->>'repeat_kind'='daily' and (ders_workspace_private.date_value(q->>'starts_on') is null or ders_workspace_private.date_value(q->>'ends_on') is null or (q->>'starts_on')::date<first_day or (q->>'ends_on')::date>last_day)) then raise exception 'Günlük görev tarihleri program aralığında olmalı.' using errcode='22023';end if;
 if cid is not null then perform 1 from public.school_classes where id=cid and teacher_id=uid and archived_at is null for no key update;if not found then raise exception 'Etkin sınıfın öğretmeni yetkili.' using errcode='42501';end if;end if;
 doc:=jsonb_build_object('class_id',cid,'week_name',btrim(p->>'week_name'),'starts_on',first_day,'ends_on',last_day,'quests',p->'quests','student_ids',(select jsonb_agg(x order by x) from (select distinct (value#>>'{}')::uuid x from jsonb_array_elements(p->'student_ids')) ids));
 perform pg_advisory_xact_lock(hashtextextended(did::text,1504));select * into batch from public.teacher_program_dispatches where id=did for update;
 existing_batch:=found;
 if cid is not null and exists(select 1 from public.class_programs where id=did and (not existing_batch or class_id<>cid or cancelled_at is not null)) then raise exception 'Program kimliği kullanılmış veya program iptal edilmiş. Yeni gönderim oluştur.' using errcode='22023';end if;
 if existing_batch then
  if batch.teacher_id<>uid then raise exception 'Gönderime erişim yok.' using errcode='42501';end if;
  if batch.body<>doc then raise exception 'Gönderim içeriği değişti. Yeni gönderim oluştur.' using errcode='22023';end if;
 else insert into public.teacher_program_dispatches(id,teacher_id,body,status) values(did,uid,doc,'sending');end if;
 if cid is not null then insert into public.class_programs(id,class_id,name,starts_on,ends_on) values(did,cid,doc->>'week_name',first_day,last_day) on conflict(id) do nothing;end if;
 for sid in select (value#>>'{}')::uuid from jsonb_array_elements(doc->'student_ids') loop
  select * into receipt from public.teacher_program_receipts where dispatch_id=did and student_id=sid;
  if found and (receipt.status='sent' or not coalesce((p->>'retry_failed')::boolean,false)) then continue;end if;
  aid:=null;error_message:=null;
  begin
   perform 1 from public.student_teacher_connections where teacher_id=uid and student_id=sid and status='approved' for share;
   if not found then raise exception 'Öğretmen bağlantısı etkin değil.' using errcode='42501';end if;
   if cid is not null and not ders_class_private.is_member(cid,sid) then raise exception 'Öğrenci etkin sınıf üyesi değil.' using errcode='42501';end if;
   answer:=public.ders_action('assign_program',jsonb_build_object('student_id',sid,'week_name',doc->>'week_name','week_range',to_char(first_day,'DD.MM.YYYY')||' – '||to_char(last_day,'DD.MM.YYYY'),'quests',doc->'quests'));
   if answer ? 'error' then raise exception '%',answer->>'error';end if;aid:=(answer->>'assignment_id')::uuid;if aid is null then raise exception 'Atama sonucu doğrulanamadı.';end if;
   if cid is not null then insert into public.class_program_recipients(program_id,class_id,student_id,assignment_id) values(did,cid,sid,aid);end if;
  exception when others then aid:=null;error_message:=left(sqlerrm,500);
  end;
  insert into public.teacher_program_receipts(dispatch_id,student_id,assignment_id,status,error) values(did,sid,aid,case when aid is null then 'failed' else 'sent' end,error_message)
   on conflict(dispatch_id,student_id) do update set assignment_id=excluded.assignment_id,status=excluded.status,error=excluded.error,attempts=teacher_program_receipts.attempts+1,updated_at=now();
 end loop;
 select count(*) filter(where status='sent'),count(*) filter(where status='failed') into sent,failed from public.teacher_program_receipts where dispatch_id=did;
 update public.teacher_program_dispatches set status=case when failed=0 then 'sent' when sent>0 then 'partial_failed' else 'failed' end,updated_at=now() where id=did;
 return ders_workspace_private.dispatch_result(did);
end $$;

create function ders_workspace_private.assignment_progress(aid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with qs as (select q.*,ders_class_private.quest_count(a.student_id,aid,q) units from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id where a.id=aid and a.teacher_id=auth.uid() and a.status='accepted' and a.archived_at is null and q.archived_at is null and ders_workspace_private.allowed(a.student_id))
 select jsonb_build_object('total',count(*),'done',count(*) filter(where units>=repeat_target),'units',coalesce(sum(units),0),'targets',coalesce(sum(repeat_target),0),'percent',round(sum(units)*100.0/nullif(sum(repeat_target),0)),'phase',case when count(*)=0 then 'empty' when count(*) filter(where units>=repeat_target)=count(*) then 'completed' when sum(units)>0 then 'in_progress' else 'not_started' end) from qs
$$;

create or replace function ders_workspace_private.week_headers(sid uuid,weeks jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg((w-'quests'-'startDate'-'endDate'-'createdAt')||jsonb_strip_nulls(jsonb_build_object(
  'startDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'startDate',w->>'start')),cp.starts_on,ders_workspace_private.date_value(batch.body->>'starts_on')),
  'endDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'endDate',w->>'end')),cp.ends_on,ders_workspace_private.date_value(batch.body->>'ends_on')),
  'createdAt',coalesce(to_jsonb(a.created_at),case when ders_workspace_private.date_value(left(w->>'createdAt',10)) is not null then w->'createdAt' end)))), '[]')
  from jsonb_array_elements(coalesce(weeks,'[]')) w
  left join public.teacher_plan_assignments a on a.week_id=w->>'id' and a.student_id=sid and a.teacher_id=auth.uid()
  left join public.class_program_recipients cr on cr.assignment_id=a.id left join public.class_programs cp on cp.id=cr.program_id
  left join public.teacher_program_receipts receipt on receipt.assignment_id=a.id left join public.teacher_program_dispatches batch on batch.id=receipt.dispatch_id and batch.teacher_id=auth.uid()
  where ders_workspace_private.allowed(sid)
$$;

alter function ders_workspace_private.action(text,jsonb) rename to action_m3;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();did uuid:=(p->>'id')::uuid;template public.teacher_program_templates%rowtype;template_body jsonb;result jsonb;aid uuid;sid uuid;lim integer:=20;off integer:=greatest(0,least(100000,coalesce((p->>'offset')::integer,0)));
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
 if p_action='send_program' then return ders_workspace_private.dispatch(p);end if;
 if p_action='dispatch_result' then return ders_workspace_private.dispatch_result(did);end if;
 if p_action='template_list' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(x order by x.favorite desc,x.updated_at desc,x.id),'[]') from (select t.id,t.name,t.favorite,t.revision,t.updated_at,jsonb_array_length(t.body->'quests') task_count from public.teacher_program_templates t where t.teacher_id=uid and (coalesce(p->>'search','')='' or t.name ilike '%'||(p->>'search')||'%') and (coalesce(p->>'exam','')='' or exists(select 1 from jsonb_array_elements(t.body->'quests') q where q->>'exam_type'=p->>'exam')) and (coalesce(p->>'subject','')='' or exists(select 1 from jsonb_array_elements(t.body->'quests') q where q->>'category'=p->>'subject')) order by t.favorite desc,t.updated_at desc,t.id limit lim offset off) x),'offset',off,'limit',lim);
 end if;
 if p_action in('template_get','template_save','template_delete','template_favorite') then
  perform pg_advisory_xact_lock(hashtextextended(did::text,1505));select * into template from public.teacher_program_templates where id=did for update;
  if found and template.teacher_id<>uid then raise exception 'Şablona erişim yok.' using errcode='42501';end if;
  if p_action='template_get' then if template.id is null then raise exception 'Şablon bulunamadı.';end if;return to_jsonb(template);end if;
  if p_action='template_save' then
   template_body:=jsonb_build_object('name',p->'body'->>'name','start',p->'body'->>'start','end',p->'body'->>'end','quests',p->'body'->'quests');
   if template.id is not null and template.body=template_body and template.name=btrim(p->>'name') then return to_jsonb(template);end if;
  end if;
  if p_action='template_favorite' and template.id is not null and template.favorite=coalesce((p->>'favorite')::boolean,false) then return to_jsonb(template);end if;
  if template.id is not null and template.revision is distinct from (p->>'revision')::integer then return jsonb_build_object('error','Şablon başka bir cihazda değişti. Açık içerik korundu.','code','template_conflict');end if;
  if p_action='template_delete' then delete from public.teacher_program_templates where id=did and teacher_id=uid;return jsonb_build_object('ok',true);end if;
  if p_action='template_favorite' then if template.id is null then raise exception 'Şablon bulunamadı.';end if;update public.teacher_program_templates set favorite=coalesce((p->>'favorite')::boolean,false),revision=revision+1,updated_at=now() where id=did returning * into template;return to_jsonb(template);end if;
  if did is null or jsonb_typeof(p->'body') is distinct from 'object' or jsonb_typeof(p->'body'->'quests') is distinct from 'array' or jsonb_array_length(p->'body'->'quests')>200 or octet_length((p->'body')::text)>200000 then raise exception 'Geçerli şablon içeriği gerekli.';end if;
  template_body:=jsonb_build_object('name',p->'body'->>'name','start',p->'body'->>'start','end',p->'body'->>'end','quests',p->'body'->'quests');
  if template.id is null then
   if coalesce((p->>'revision')::integer,0)<>0 then raise exception 'Şablon artık bulunmuyor. Yeni kopya olarak kaydet.';end if;
   insert into public.teacher_program_templates(id,teacher_id,name,body) values(did,uid,btrim(p->>'name'),template_body) returning * into template;
  else update public.teacher_program_templates set name=btrim(p->>'name'),body=template_body,revision=revision+1,updated_at=now() where id=did returning * into template;end if;return to_jsonb(template);
 end if;
 if p_action='acceptances' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(x order by x.created_at desc,x.id),'[]') from (select a.id,a.student_id,u.display_name name,a.week_name,a.week_range,a.status,a.archived_at,a.created_at,cp.cancelled_at,case when a.status='accepted' and cp.cancelled_at is null then ders_workspace_private.assignment_progress(a.id) else null end progress,coalesce(cp.starts_on,ders_workspace_private.date_value(b.body->>'starts_on'),(a.created_at at time zone 'Europe/Istanbul')::date) starts_on
   from public.teacher_plan_assignments a join public.user_profiles u on u.id=a.student_id left join public.class_program_recipients r on r.assignment_id=a.id left join public.class_programs cp on cp.id=r.program_id left join public.teacher_program_receipts receipt on receipt.assignment_id=a.id left join public.teacher_program_dispatches b on b.id=receipt.dispatch_id
   where a.teacher_id=uid and ders_workspace_private.allowed(a.student_id) and (coalesce(p->>'search','')='' or u.display_name ilike '%'||(p->>'search')||'%') and (coalesce(p->>'status','all')='all' or p->>'status'='cancelled' and cp.cancelled_at is not null or a.status=p->>'status' and cp.cancelled_at is null) and (nullif(p->>'class_id','') is null or r.class_id=(p->>'class_id')::uuid)
    and (nullif(p->>'week_start','') is null or coalesce(cp.starts_on,ders_workspace_private.date_value(b.body->>'starts_on'),(a.created_at at time zone 'Europe/Istanbul')::date) between (p->>'week_start')::date and (p->>'week_start')::date+6)
   order by a.created_at desc,a.id limit lim offset off) x),'offset',off,'limit',lim);
 end if;
 if p_action='remind' then
  aid:=did;select a.student_id into sid from public.teacher_plan_assignments a where a.id=aid and a.teacher_id=uid and a.status='pending' and a.archived_at is null and ders_workspace_private.allowed(a.student_id) for update;
  if sid is null then raise exception 'Etkin, yanıt bekleyen program bulunamadı.' using errcode='42501';end if;
  if exists(select 1 from public.class_program_recipients r where r.assignment_id=aid and (not ders_class_private.is_member(r.class_id,sid) or exists(select 1 from public.class_programs cp where cp.id=r.program_id and cp.cancelled_at is not null))) then raise exception 'Öğrencinin sınıf üyeliği sona ermiş.';end if;
  if exists(select 1 from public.notification_preferences where user_id=sid and not program) then return jsonb_build_object('status','skipped','message','Öğrenci program bildirimlerini kapatmış.');end if;
  if exists(select 1 from ders_workspace_private.reminders where assignment_id=aid and sent_at>now()-interval '24 hours') then return jsonb_build_object('status','skipped','message','Bu program için son 24 saatte hatırlatma gönderildi.');end if;
  insert into ders_workspace_private.reminders(assignment_id) values(aid) on conflict(assignment_id) do update set sent_at=now();
  perform ders_learning_private.notify(sid,'workspace-reminder:'||aid||':'||(now() at time zone 'Europe/Istanbul')::date,'program',uid,sid,null,null,aid);return jsonb_build_object('status','sent');
 end if;
 return ders_workspace_private.action_m3(p_action,p);
end $$;
revoke all on function ders_workspace_private.action_m3(text,jsonb),ders_workspace_private.dispatch(jsonb),ders_workspace_private.dispatch_result(uuid),ders_workspace_private.assignment_progress(uuid) from public,anon,authenticated;
revoke all on function ders_workspace_private.action(text,jsonb) from public,anon;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';

do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-M4';
end $verify$;

drop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;

-- M5
set local lock_timeout='5s';
do $guard$ begin
 if to_regclass('public.teacher_program_templates') is null or to_regprocedure('ders_workspace_private.analysis(uuid,jsonb)') is not null then raise exception 'Unexpected workspace schema; inspect before migration';end if;
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
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-M5',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
-- Teacher-only, read-only analysis. No existing rows, XP, policies or grants are rewritten.
create function ders_workspace_private.analysis_period(cid uuid,p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare mode text:=coalesce(p->>'period','week');a date;b date;today date:=(now() at time zone 'Europe/Istanbul')::date;created date;
begin
 if not ders_class_private.is_teacher(cid) then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 select (created_at at time zone 'Europe/Istanbul')::date into created from public.school_classes where id=cid;
 if mode='all' then a:=created;b:=today;
 elsif mode='week' then a:=coalesce(ders_workspace_private.date_value(p->>'week_start'),date_trunc('week',today)::date);b:=a+6;if p ? 'week_start' and ders_workspace_private.date_value(p->>'week_start') is null then raise exception 'Geçerli hafta seç.' using errcode='22023';end if;
 elsif mode='month' then a:=ders_workspace_private.date_value(coalesce(p->>'month',to_char(today,'YYYY-MM')||'-01'));if a is not null then a:=date_trunc('month',a)::date;b:=(a+interval '1 month'-interval '1 day')::date;end if;
 elsif mode='year' then if p->>'year'!~'^\d{4}$' then raise exception 'Geçerli yıl seç.' using errcode='22023';end if;a:=make_date((p->>'year')::int,1,1);b:=make_date((p->>'year')::int,12,31);
 elsif mode='custom' then a:=ders_workspace_private.date_value(p->>'starts_on');b:=ders_workspace_private.date_value(p->>'ends_on');
 end if;
 if a is null or b is null or b<a or a<date '2000-01-01' or b>date '2200-12-31' or b-a>36600 then raise exception 'Geçerli dönem seç. En uzun özel aralık 100 yıldır.' using errcode='22023';end if;
 return jsonb_build_object('mode',mode,'requested_start',a,'requested_end',b,'starts_on',greatest(a,created),'ends_on',least(b,today),'empty',greatest(a,created)>least(b,today),'time_zone','Europe/Istanbul');
end $$;

-- Use the same validated date scope throughout teacher class screens and reports.
alter function ders_class_private.period(uuid,jsonb) rename to period_m2;
create function ders_class_private.period(cid uuid,p jsonb) returns table(first_day date,last_day date)
language plpgsql stable security definer set search_path='' as $$
declare dates jsonb;
begin
 if ders_class_private.is_teacher(cid) then dates:=ders_workspace_private.analysis_period(cid,p);first_day:=(dates->>'starts_on')::date;last_day:=(dates->>'ends_on')::date;return next;
 else return query select * from ders_class_private.period_m2(cid,p);end if;
end $$;
revoke all on function ders_class_private.period(uuid,jsonb),ders_class_private.period_m2(uuid,jsonb) from public,anon,authenticated;

create function ders_workspace_private.student_analysis(cid uuid,sid uuid,first_day date,last_day date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not ders_class_private.is_teacher(cid) or not ders_workspace_private.allowed(sid) or not ders_class_private.is_member(cid,sid) then raise exception 'Etkin üyelik ve öğretmen bağlantısı gerekli.' using errcode='42501';end if;
 with recipients as materialized (
  select a.* from public.class_program_recipients r join public.class_programs cp on cp.id=r.program_id join public.teacher_plan_assignments a on a.id=r.assignment_id
  where cp.class_id=cid and r.student_id=sid and cp.cancelled_at is null and cp.starts_on<=last_day and cp.ends_on>=first_day and ders_class_private.eligible_record(cid,sid,a.created_at,a.created_at)
 ), qs as materialized (
  select q.*,ders_class_private.quest_count(sid,a.id,q) units from recipients a join public.teacher_assigned_quests q on q.assignment_id=a.id
  where a.status='accepted' and a.archived_at is null and q.archived_at is null
 ), totals as (
  select count(*) total,count(*) filter(where units>=repeat_target) done,coalesce(sum(units),0) units,coalesce(sum(repeat_target),0) targets from qs
 ), segments as materialized (
  select s.* from public.study_segments s where s.user_id=sid and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,sid,s.started_at,s.ended_at)
 ), exams as materialized (
  select e.*,(select jsonb_agg(g order by g->>'id')::text from jsonb_array_elements(e.groups) g) scope from public.practice_exams e
   where e.user_id=sid and e.exam_date between first_day and last_day and ders_class_private.eligible_exam(cid,sid,e.exam_date,e.created_at)
 ), full_exams as (
  select distinct on(exam_type,scope,maximum) e.*,
   first_value(total_net) over(partition by exam_type,scope,maximum order by exam_date,created_at,id) first_net,
   count(*) over(partition by exam_type,scope,maximum) samples
  from exams e where not is_partial and total_net is not null order by exam_type,scope,maximum,exam_date desc,created_at desc,id desc
 ) select jsonb_build_object('id',sid,'name',(select display_name from public.user_profiles where id=sid),
 'homework',(select to_jsonb(t)||jsonb_build_object('percent',round(t.units*100.0/nullif(t.targets,0)),'completion_percent',round(t.done*100.0/nullif(t.total,0)),
   'by_subject',(select coalesce(jsonb_agg(x order by x.done desc,x.subject),'[]') from (select category_name subject,count(*) total,count(*) filter(where units>=repeat_target) done,sum(units) units,sum(repeat_target) targets from qs group by category_name) x),
   'incomplete',(select coalesce(jsonb_agg(x),'[]') from (select id,coalesce(custom_title,title) title,category_name subject,units,repeat_target target from qs where units<repeat_target order by units desc,sort_order,id limit 20) x)) from totals t),
 'acceptance',jsonb_build_object('sent',(select count(*) from recipients),'accepted',(select count(*) from recipients where status='accepted' and archived_at is null),'pending',(select count(*) from recipients where status='pending' and archived_at is null),'rejected',(select count(*) from recipients where status='rejected'),'withdrawn',(select count(*) from recipients where status='withdrawn'),'archived',(select count(*) from recipients where archived_at is not null)),
 'study',jsonb_build_object('duration_ms',(select coalesce(sum(duration_ms),0) from segments),'records',(select count(*) from segments),
   'by_subject',(select coalesce(jsonb_agg(x order by x.duration_ms desc),'[]') from (select category_name subject,sum(duration_ms) duration_ms from segments group by category_name) x),
   'by_day',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select (started_at at time zone 'Europe/Istanbul')::date as day,sum(duration_ms) duration_ms from segments group by 1) x)),
 'exams',(select coalesce(jsonb_agg(jsonb_build_object('exam_type',exam_type,'scope',scope,'maximum',maximum,'last_net',total_net,'first_net',first_net,'change',case when samples>=2 then total_net-first_net end,'samples',samples,'date',exam_date,'results',results) order by exam_type,scope),'[]') from full_exams),
 'partial_exams',(select count(*) from exams where is_partial),
 'class_xp',(select coalesce(sum(amount),0) from public.class_xp_ledger l where l.class_id=cid and l.student_id=sid and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,sid,l.created_at,l.created_at))
 ) into result;return result;
end $$;

create function ders_workspace_private.analysis_snapshot(cid uuid,a date,b date,chosen jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare students jsonb;result jsonb;
begin
 if not ders_class_private.is_teacher(cid) then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 select coalesce(jsonb_agg(ders_workspace_private.student_analysis(cid,m.student_id,a,b) order by u.display_name,m.student_id),'[]') into students
  from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and ders_class_private.is_member(cid,m.student_id) and (chosen is null or chosen ? m.student_id::text);
 with items as (select x from jsonb_array_elements(students) x), exams as (
  select x->>'id' sid,e,e->>'exam_type' exam_type,e->>'scope' scope,(e->>'maximum')::numeric maximum from items,jsonb_array_elements(x->'exams') e
 ), exam_avg as (
  select exam_type,scope,maximum,count(*) participants,round(avg((e->>'last_net')::numeric),2) average from exams group by exam_type,scope,maximum
 ), exam_parts as (
  select exam_type,scope,maximum,k.key subject,round(avg((k.value->>'correct')::numeric-(k.value->>'wrong')::numeric/4),2) net,count(*) participants from exams,jsonb_each(e->'results') k where k.value->>'correct' is not null and k.value->>'wrong' is not null group by exam_type,scope,maximum,k.key
 ), totals as (
  select count(*) active_students,coalesce(sum((x->'acceptance'->>'sent')::int),0) sent,coalesce(sum((x->'acceptance'->>'accepted')::int),0) accepted,
   coalesce(sum((x->'acceptance'->>'pending')::int),0) pending,coalesce(sum((x->'homework'->>'total')::int),0) tasks,
   coalesce(sum((x->'homework'->>'done')::int),0) done,coalesce(sum((x->'homework'->>'units')::int),0) units,coalesce(sum((x->'homework'->>'targets')::int),0) targets,
   coalesce(sum((x->'study'->>'duration_ms')::bigint),0) study_ms,coalesce(sum((x->>'partial_exams')::int),0) partial_exams from items
 ) select jsonb_build_object('students',students,'summary',(select to_jsonb(t)||jsonb_build_object('completion_percent',round(done*100.0/nullif(tasks,0)),'repeat_percent',round(units*100.0/nullif(targets,0)),'acceptance_percent',round(accepted*100.0/nullif(sent,0)),'study_per_student',study_ms/nullif(active_students,0)) from totals t),
  'exams',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('subjects',(select coalesce(jsonb_agg(jsonb_build_object('subject',p.subject,'net',p.net,'participants',p.participants)),'[]') from exam_parts p where p.exam_type=e.exam_type and p.scope=e.scope and p.maximum=e.maximum)) order by e.exam_type,e.scope),'[]') from exam_avg e)) into result;return result;
end $$;

create function ders_workspace_private.analysis(cid uuid,p jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare period jsonb;first_day date;last_day date;raw_start date;raw_end date;chosen jsonb;current_data jsonb;previous_data jsonb;prior_start date;prior_end date;result jsonb;
begin
 period:=ders_workspace_private.analysis_period(cid,p);first_day:=(period->>'starts_on')::date;last_day:=(period->>'ends_on')::date;raw_start:=(period->>'requested_start')::date;raw_end:=(period->>'requested_end')::date;
 if p ? 'student_ids' then
  if jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 2 and 12 then raise exception 'Karşılaştırma için 2–12 öğrenci seç.' using errcode='22023';end if;
  chosen:=p->'student_ids';if (select count(distinct s) from jsonb_array_elements_text(chosen) s)<2 then raise exception 'İki farklı öğrenci seç.' using errcode='22023';end if;if exists(select 1 from jsonb_array_elements_text(chosen) s where not ders_class_private.is_member(cid,s::uuid) or not ders_workspace_private.allowed(s::uuid)) then raise exception 'Seçilen öğrencilerden birine erişim sona erdi.' using errcode='42501';end if;
 end if;
 current_data:=ders_workspace_private.analysis_snapshot(cid,first_day,last_day,chosen);
 if period->>'mode'<>'all' then
  if period->>'mode'='month' then prior_start:=(raw_start-interval '1 month')::date;prior_end:=raw_start-1;
  elsif period->>'mode'='year' then prior_start:=(raw_start-interval '1 year')::date;prior_end:=raw_start-1;
  else prior_end:=raw_start-1;prior_start:=prior_end-(raw_end-raw_start);end if;
  previous_data:=ders_workspace_private.analysis_snapshot(cid,prior_start,least(prior_end,(now() at time zone 'Europe/Istanbul')::date),chosen)||jsonb_build_object('starts_on',prior_start,'ends_on',prior_end);
 end if;
 result:=jsonb_build_object('class',jsonb_build_object('id',cid,'name',(select name from public.school_classes where id=cid)),'period',period,'current',current_data,'previous',previous_data,
  'methods',jsonb_build_object('progress','Programların gerçek tarihleri seçilen döneme denk gelen, kabul edilmiş ve arşivlenmemiş görevlerin güncel ilerlemesi. Geçmişteki durumun anlık görüntüsü değildir.','study','Güncel üyelik ile onaylı bağlantı dönemlerinin kesişimindeki doğrulanmış Odak kayıtları.','exams','Öğrenci başına dönem içindeki son tam deneme; sınav, kapsam ve azami net ayrı. Kısmi denemeler ortalamaya katılmaz. Veri yoksa net sıfır sayılmaz.'),
  'actions',jsonb_build_object(
   'pending',(select coalesce(jsonb_agg(x),'[]') from (select a.id,a.student_id,u.display_name name,a.week_name from public.teacher_plan_assignments a join public.class_program_recipients r on r.assignment_id=a.id join public.user_profiles u on u.id=a.student_id where r.class_id=cid and a.status='pending' and a.archived_at is null and ders_class_private.is_member(cid,a.student_id) order by a.created_at limit 30) x),
   'changes',(select coalesce(jsonb_agg(x),'[]') from (select cr.id,cr.student_id,u.display_name name,q.title from public.quest_change_requests cr join public.teacher_assigned_quests q on q.id=cr.quest_id join public.class_program_recipients r on r.assignment_id=q.assignment_id join public.user_profiles u on u.id=cr.student_id where r.class_id=cid and cr.teacher_id=auth.uid() and cr.status='pending' and ders_class_private.is_member(cid,cr.student_id) order by cr.created_at limit 30) x),
   'not_started',(select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name')),'[]') from jsonb_array_elements(current_data->'students') s where (s->'homework'->>'total')::int>0 and (s->'homework'->>'units')::int=0),
   'shared_due',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'ends_on',ends_on)),'[]') from public.class_shared_tasks where class_id=cid and status='open' and ends_on between (now() at time zone 'Europe/Istanbul')::date and (now() at time zone 'Europe/Istanbul')::date+7)));
 return result;
end $$;

create function ders_workspace_private.contribution_audit(cid uuid,p jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare period jsonb;result jsonb;off int:=greatest(0,coalesce((p->>'offset')::int,0));sid uuid:=nullif(p->>'student_id','')::uuid;tid uuid:=nullif(p->>'task_id','')::uuid;
begin
 period:=ders_workspace_private.analysis_period(cid,p);if off>100000 then raise exception 'Geçerli sayfa seç.' using errcode='22023';end if;
 if sid is not null and (not ders_workspace_private.allowed(sid) or not ders_class_private.is_member(cid,sid)) then raise exception 'Öğrenciye erişim yok.' using errcode='42501';end if;
 with candidates as materialized (
  select c.*,u.display_name name,t.kind,t.name task_name,t.subject,t.target,t.status task_status,
   (select coalesce(sum(amount),0) from public.class_contributions x where x.task_id=c.task_id) task_total,
   (select coalesce(sum(amount),0) from public.class_contributions x where x.task_id=c.task_id and x.student_id=c.student_id) student_total,
   (select coalesce(sum(amount),0) from public.class_xp_ledger l where l.class_id=cid and l.task_id=c.task_id and l.student_id=c.student_id) earned_class_xp,
   (t.kind='questions' and (c.amount>=500 or (select sum(x.amount) from public.class_contributions x where x.task_id=c.task_id and x.student_id=c.student_id and x.created_at between c.created_at-interval '5 minutes' and c.created_at)>=1000)) review_suggested
  from public.class_contributions c join public.user_profiles u on u.id=c.student_id join public.class_shared_tasks t on t.id=c.task_id
  where c.class_id=cid and c.contribution_date between (period->>'starts_on')::date and (period->>'ends_on')::date and (sid is null or c.student_id=sid) and (tid is null or c.task_id=tid) and ders_workspace_private.allowed(c.student_id)
  order by c.created_at desc,c.id limit 21 offset off
 ), page as (select * from candidates order by created_at desc,id limit 20)
 select jsonb_build_object('period',period,'items',coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('student_percent',round(c.student_total*100.0/nullif(c.task_total,0),1),
  'corrections',(select coalesce(jsonb_agg(jsonb_build_object('date',e.created_at,'previous_amount',e.context->'previous_amount','amount',e.context->'new_amount','reason',e.context->>'reason') order by e.created_at),'[]') from public.class_events e where e.class_id=cid and e.action='correct_contribution' and e.context->>'id'=c.id::text)) order by c.created_at desc,c.id),'[]'),'offset',off,'has_more',(select count(*)>20 from candidates),'method','Soru katkıları beyana dayalıdır. İnceleme işareti yaptırım veya hile tespiti değildir. Net süre doğrulanmış Odak kaydından gelir; ödül düzeltmeleri mevcut ledger içinde korunur.') into result from page c;
 return result;
end $$;

alter function ders_workspace_private.action(text,jsonb) rename to action_m4;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if p_action='analysis' then return ders_workspace_private.analysis((p->>'class_id')::uuid,p);end if;
 if p_action='contribution_audit' then return ders_workspace_private.contribution_audit((p->>'class_id')::uuid,p);end if;
 return ders_workspace_private.action_m4(p_action,p);
end $$;
revoke all on function ders_workspace_private.analysis_period(uuid,jsonb),ders_workspace_private.student_analysis(uuid,uuid,date,date),ders_workspace_private.analysis_snapshot(uuid,date,date,jsonb),ders_workspace_private.analysis(uuid,jsonb),ders_workspace_private.contribution_audit(uuid,jsonb),ders_workspace_private.action_m4(text,jsonb) from public,anon,authenticated;
revoke all on function ders_workspace_private.action(text,jsonb) from public,anon;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';

do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-M5';
end $verify$;

drop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;

-- Native Supabase Cron; no external paid scheduler, API key or network request.
do $cron_available$ begin if not exists(select 1 from pg_available_extensions where name='pg_cron') then raise exception 'Native pg_cron unavailable; installation stopped.';end if;end $cron_available$;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- M6
set local lock_timeout='5s';
do $guard$ begin
 if to_regprocedure('ders_workspace_private.analysis(uuid,jsonb)') is null or to_regclass('public.teacher_scheduled_programs') is not null then raise exception 'Unexpected workspace schema; inspect before migration';end if;
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
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-M6',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
-- Durable teacher schedules. Cron invokes a private database worker, never a browser timer.
create table public.teacher_scheduled_programs(
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),dispatch_id uuid not null unique,
 body jsonb not null check(octet_length(body::text)<=200000),authorization_periods jsonb not null,
 due_at timestamptz not null,time_zone text not null default 'Europe/Istanbul' check(time_zone='Europe/Istanbul'),
 status text not null default 'scheduled' check(status in('scheduled','sending','retry_wait','sent','partial_failed','failed','cancelled')),
 revision int not null default 1,attempts int not null default 0,result jsonb,next_attempt_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),sent_at timestamptz
);
create index teacher_schedule_owner on public.teacher_scheduled_programs(teacher_id,due_at desc,id);
create index teacher_schedule_due on public.teacher_scheduled_programs(coalesce(next_attempt_at,due_at),id) where status in('scheduled','retry_wait');
alter table public.teacher_scheduled_programs enable row level security;
revoke all on public.teacher_scheduled_programs from public,anon,authenticated;
grant select on public.teacher_scheduled_programs to authenticated;
create policy teacher_schedule_owner on public.teacher_scheduled_programs for select to authenticated using(teacher_id=(select auth.uid()) and exists(select 1 from public.user_profiles where id=(select auth.uid()) and role='teacher'));

create function ders_workspace_private.scheduler_active() returns boolean language plpgsql stable security definer set search_path='' as $$
declare active boolean:=false;begin
 if to_regclass('cron.job') is not null then execute 'select exists(select 1 from cron.job where jobname=$1 and active and username=current_user and schedule=''* * * * *'' and command=$2)' into active using 'ders-v150-program-dispatch','select ders_workspace_private.run_due(2)';end if;return active;
end $$;
create function ders_workspace_private.scheduled_scope(p jsonb,uid uuid,cid uuid,sid uuid) returns void language plpgsql stable security definer set search_path='' as $$
declare expected jsonb:=p->'authorization_periods'->sid::text;begin
 if not p ? 'authorization_periods' then return;end if;
 if expected is null or not exists(select 1 from ders_class_private.connection_periods c where c.teacher_id=uid and c.student_id=sid and c.ends_at is null and c.id::text=expected->>'connection') then raise exception 'Planlamadan sonra öğretmen bağlantısı dönemi değişti. Yeni planlama gerekli.' using errcode='42501';end if;
 if cid is not null and not exists(select 1 from ders_class_private.membership_periods m where m.class_id=cid and m.student_id=sid and m.ends_at is null and m.id::text=expected->>'membership') then raise exception 'Planlamadan sonra sınıf üyeliği dönemi değişti. Yeni planlama gerekli.' using errcode='42501';end if;
end $$;

create function ders_workspace_private.schedule_document(p jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();cid uuid:=nullif(p->>'class_id','')::uuid;first_day date:=ders_workspace_private.date_value(p->>'starts_on');last_day date:=ders_workspace_private.date_value(p->>'ends_on');q jsonb;kind text;target int;begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
 if first_day is null or last_day is null or last_day<first_day or length(btrim(coalesce(p->>'week_name',''))) not between 1 and 120 or jsonb_typeof(p->'quests') is distinct from 'array' or jsonb_array_length(p->'quests') not between 1 and 200 or jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 1 and 200 then raise exception 'Geçerli program, tarihler, görevler ve alıcılar gerekli.' using errcode='22023';end if;
 if cid is not null and not exists(select 1 from public.school_classes where id=cid and teacher_id=uid and archived_at is null) then raise exception 'Etkin sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 if exists(select 1 from jsonb_array_elements_text(p->'student_ids') s where not ders_workspace_private.allowed(s::uuid) or cid is not null and not ders_class_private.is_member(cid,s::uuid)) then raise exception 'Bütün alıcılarla etkin bağlantı ve sınıf üyeliği gerekli.' using errcode='42501';end if;
 for q in select * from jsonb_array_elements(p->'quests') loop
  kind:=coalesce(q->>'repeat_kind','none');target:=coalesce((q->>'repeat_target')::int,1);
  if length(btrim(coalesce(q->>'category',''))) not between 1 and 100 or length(btrim(coalesce(q->>'title',''))) not between 1 and 200 or length(coalesce(q->>'detail',''))>500 or (q->>'xp') is null or (q->>'xp')::numeric not between 5 and 10000 or (q->>'xp')::numeric<>trunc((q->>'xp')::numeric) or nullif(q->>'exam_type','') not in('TYT','AYT','KPSS') or kind not in('none','weekly','daily') or target not between 1 and 100 then raise exception 'Ders, konu, XP ve tekrar alanlarını kontrol et.' using errcode='22023';end if;
  if kind='daily' and (ders_workspace_private.date_value(q->>'starts_on') is null or ders_workspace_private.date_value(q->>'ends_on') is null or (q->>'starts_on')::date<first_day or (q->>'ends_on')::date>last_day or (q->>'ends_on')::date<(q->>'starts_on')::date or (q->>'ends_on')::date-(q->>'starts_on')::date>=31 or target<>(q->>'ends_on')::date-(q->>'starts_on')::date+1) then raise exception 'Günlük görev tarihleri program içinde 1–31 gün olmalı.' using errcode='22023';end if;
  if q->>'topic_scope' is not null and (q->>'topic_scope' not in('category','topic') or nullif(q->>'exam_type','') is null or nullif(btrim(q->>'topic_category'),'') is null or q->>'topic_scope'='topic' and nullif(btrim(q->>'topic_name'),'') is null or q->>'topic_scope'='category' and q->>'topic_name' is not null) then raise exception 'Müfredat kapsamı alanlarını kontrol et.' using errcode='22023';end if;
 end loop;
 return jsonb_build_object('class_id',cid,'week_name',btrim(p->>'week_name'),'starts_on',first_day,'ends_on',last_day,'quests',p->'quests','student_ids',(select jsonb_agg(s order by s) from (select distinct value::uuid s from jsonb_array_elements_text(p->'student_ids')) x));
end $$;

create function ders_workspace_private.schedule_action(action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();did uuid:=(p->>'id')::uuid;item public.teacher_scheduled_programs%rowtype;doc jsonb;due timestamptz;periods jsonb;cid uuid;off int:=greatest(0,coalesce((p->>'offset')::int,0));begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
 if action='schedule_health' then return jsonb_build_object('active',ders_workspace_private.scheduler_active(),'server_time',clock_timestamp(),'time_zone','Europe/Istanbul','resolution_seconds',60,'max_attempts',3);end if;
 if action='schedule_list' then return jsonb_build_object('items',(select coalesce(jsonb_agg(x order by x.due_at desc,x.id),'[]') from (select id,due_at,status,revision,attempts,result,time_zone,created_at,updated_at,body->>'week_name' week_name,body->>'starts_on' starts_on,body->>'ends_on' ends_on,body->'student_ids' student_ids,jsonb_array_length(body->'quests') task_count from public.teacher_scheduled_programs where teacher_id=uid and (nullif(p->>'class_id','') is null or body->>'class_id'=p->>'class_id') order by due_at desc,id limit 20 offset least(off,100000)) x));end if;
 if did is null then raise exception 'Planlama kimliği gerekli.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(did::text,1506));select * into item from public.teacher_scheduled_programs where id=did for update;
 if item.id is not null and item.teacher_id<>uid then raise exception 'Bu planlamaya erişim yok.' using errcode='42501';end if;
 if action='schedule_get' then return case when item.id is null then null else to_jsonb(item)-'authorization_periods' end;end if;
 if action='schedule_cancel' then
  if item.id is null then raise exception 'Planlama bulunamadı.' using errcode='42501';end if;
  if item.status='cancelled' then return to_jsonb(item);end if;
  if item.revision is distinct from (p->>'revision')::int then return jsonb_build_object('error','Planlama durumu değişti. Güncel listeyi aç.','code','schedule_conflict');end if;
  if item.status not in('scheduled','retry_wait','partial_failed','failed') then raise exception 'Gönderimi tamamlanan program iptal edilemez. Gönderilmiş atamalar korunur.' using errcode='22023';end if;
  update public.teacher_scheduled_programs set status='cancelled',revision=revision+1,next_attempt_at=null,updated_at=now() where id=did returning * into item;return to_jsonb(item);
 end if;
 if action<>'schedule_save' then raise exception 'Desteklenmeyen planlama işlemi.' using errcode='22023';end if;
 if not ders_workspace_private.scheduler_active() then raise exception 'Sunucu zamanlayıcısı bu ortamda etkin değil. Program planlanmadı; hemen gönderebilirsin.' using errcode='55000';end if;
 doc:=ders_workspace_private.schedule_document(p);cid:=(doc->>'class_id')::uuid;
 if coalesce(p->>'send_at','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' then raise exception 'Türkiye saatine göre geçerli gönderim tarih ve saati seç.' using errcode='22023';end if;
 due:=(p->>'send_at')::timestamp at time zone 'Europe/Istanbul';if due<=clock_timestamp() or (doc->>'ends_on')::date<(due at time zone 'Europe/Istanbul')::date then raise exception 'Gönderim gelecekte, program bitişinden önce olmalı. Saat dilimi Europe/Istanbul.' using errcode='22023';end if;
 if item.id is not null then
  if item.body=doc and item.due_at=due then return to_jsonb(item);end if;
  if item.status<>'scheduled' or item.attempts<>0 then raise exception 'Gönderim başlamış planlama düzenlenemez. Başarılı atamalar korunur.' using errcode='22023';end if;
  if item.revision is distinct from (p->>'revision')::int then return jsonb_build_object('error','Planlama başka bir cihazda değişti. Açık form korundu.','code','schedule_conflict');end if;
 elsif coalesce((p->>'revision')::int,0)<>0 then raise exception 'Planlama bulunamadı. Yeni kopya oluştur.' using errcode='22023';end if;
 select jsonb_object_agg(s,jsonb_build_object('connection',(select id from ders_class_private.connection_periods where teacher_id=uid and student_id=s::uuid and ends_at is null),'membership',(select id from ders_class_private.membership_periods where class_id=cid and student_id=s::uuid and ends_at is null))) into periods from jsonb_array_elements_text(doc->'student_ids') s;
 if item.id is null then insert into public.teacher_scheduled_programs(id,teacher_id,dispatch_id,body,authorization_periods,due_at) values(did,uid,gen_random_uuid(),doc,periods,due) returning * into item;
 else update public.teacher_scheduled_programs j set body=doc,authorization_periods=periods,due_at=due,revision=j.revision+1,updated_at=now() where j.id=did returning j.* into item;
 end if;return to_jsonb(item);
end $$;

create function ders_workspace_private.run_due(batch_limit int default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.teacher_scheduled_programs%rowtype;r jsonb;state text;message text;processed int:=0;prior_sub text:=coalesce(current_setting('request.jwt.claim.sub',true),'');prior_claims text:=coalesce(current_setting('request.jwt.claims',true),'');begin
 if not pg_try_advisory_xact_lock(150,1506) then return jsonb_build_object('processed',0,'busy',true);end if;
 for job in select * from public.teacher_scheduled_programs where status in('scheduled','retry_wait') and coalesce(next_attempt_at,due_at)<=clock_timestamp() order by coalesce(next_attempt_at,due_at),id limit greatest(1,least(batch_limit,4)) for update skip locked loop
  begin
   update public.teacher_scheduled_programs set status='sending',updated_at=now() where id=job.id;
   perform set_config('request.jwt.claim.sub',job.teacher_id::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',job.teacher_id,'role','authenticated')::text,true);
   r:=ders_workspace_private.dispatch(job.body||jsonb_build_object('id',job.dispatch_id,'retry_failed',true,'authorization_periods',job.authorization_periods));
   state:=case when r->>'status'='sent' then 'sent' when job.attempts+1<3 then 'retry_wait' else r->>'status' end;
   update public.teacher_scheduled_programs set status=state,attempts=job.attempts+1,result=r,revision=revision+1,updated_at=now(),sent_at=case when state='sent' then now() end,next_attempt_at=case when state='retry_wait' then now()+(5*power(3,job.attempts))*interval '1 minute' end where id=job.id;
  exception when others then
   message:=left(sqlerrm,500);state:=case when sqlstate in('42501','22023') or job.attempts+1>=3 then 'failed' else 'retry_wait' end;
   update public.teacher_scheduled_programs set status=state,attempts=job.attempts+1,revision=revision+1,result=jsonb_build_object('error',message,'code',sqlstate),next_attempt_at=case when state='retry_wait' then now()+(5*power(3,job.attempts))*interval '1 minute' end,updated_at=now() where id=job.id;
  end;
  perform set_config('request.jwt.claim.sub',prior_sub,true);perform set_config('request.jwt.claims',prior_claims,true);processed:=processed+1;
 end loop;return jsonb_build_object('processed',processed);
end $$;

-- Same canonical dispatcher and idempotent receipts; only the saved authorization-period check is added.
create or replace function ders_workspace_private.dispatch(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();did uuid:=(p->>'id')::uuid;cid uuid:=nullif(p->>'class_id','')::uuid;doc jsonb;batch public.teacher_program_dispatches%rowtype;receipt public.teacher_program_receipts%rowtype;sid uuid;aid uuid;answer jsonb;error_message text;first_day date;last_day date;sent integer;failed integer;existing_batch boolean;
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
 first_day:=ders_workspace_private.date_value(p->>'starts_on');last_day:=ders_workspace_private.date_value(p->>'ends_on');
 if did is null or length(btrim(coalesce(p->>'week_name',''))) not between 1 and 120 or first_day is null or last_day is null or last_day<first_day or jsonb_typeof(p->'quests') is distinct from 'array' or jsonb_array_length(p->'quests') not between 1 and 200 or jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 1 and 200 then raise exception 'Program adı, geçerli tarihler, görevler ve alıcılar gerekli.' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p->'quests') q where nullif(btrim(q->>'category'),'') is null or nullif(btrim(q->>'title'),'') is null or q->>'xp' is null or (q->>'xp')::numeric not between 5 and 10000 or (q->>'xp')::numeric<>trunc((q->>'xp')::numeric)) then raise exception 'Her görevin ders, konu ve geçerli XP alanı gerekli.' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p->'quests') q where q->>'repeat_kind'='daily' and (ders_workspace_private.date_value(q->>'starts_on') is null or ders_workspace_private.date_value(q->>'ends_on') is null or (q->>'starts_on')::date<first_day or (q->>'ends_on')::date>last_day)) then raise exception 'Günlük görev tarihleri program aralığında olmalı.' using errcode='22023';end if;
 if cid is not null then perform 1 from public.school_classes where id=cid and teacher_id=uid and archived_at is null for no key update;if not found then raise exception 'Etkin sınıfın öğretmeni yetkili.' using errcode='42501';end if;end if;
 doc:=jsonb_build_object('class_id',cid,'week_name',btrim(p->>'week_name'),'starts_on',first_day,'ends_on',last_day,'quests',p->'quests','student_ids',(select jsonb_agg(x order by x) from (select distinct (value#>>'{}')::uuid x from jsonb_array_elements(p->'student_ids')) ids));
 perform pg_advisory_xact_lock(hashtextextended(did::text,1504));select * into batch from public.teacher_program_dispatches where id=did for update;
 existing_batch:=found;
 if cid is not null and exists(select 1 from public.class_programs where id=did and (not existing_batch or class_id<>cid or cancelled_at is not null)) then raise exception 'Program kimliği kullanılmış veya program iptal edilmiş. Yeni gönderim oluştur.' using errcode='22023';end if;
 if existing_batch then
  if batch.teacher_id<>uid then raise exception 'Gönderime erişim yok.' using errcode='42501';end if;
  if batch.body<>doc then raise exception 'Gönderim içeriği değişti. Yeni gönderim oluştur.' using errcode='22023';end if;
 else insert into public.teacher_program_dispatches(id,teacher_id,body,status) values(did,uid,doc,'sending');end if;
 if cid is not null then insert into public.class_programs(id,class_id,name,starts_on,ends_on) values(did,cid,doc->>'week_name',first_day,last_day) on conflict(id) do nothing;end if;
 for sid in select (value#>>'{}')::uuid from jsonb_array_elements(doc->'student_ids') loop
  select * into receipt from public.teacher_program_receipts where dispatch_id=did and student_id=sid;
  if found and (receipt.status='sent' or not coalesce((p->>'retry_failed')::boolean,false)) then continue;end if;
  aid:=null;error_message:=null;
  begin
   perform 1 from public.student_teacher_connections where teacher_id=uid and student_id=sid and status='approved' for share;
   if not found then raise exception 'Öğretmen bağlantısı etkin değil.' using errcode='42501';end if;
   if cid is not null and not ders_class_private.is_member(cid,sid) then raise exception 'Öğrenci etkin sınıf üyesi değil.' using errcode='42501';end if;
   perform ders_workspace_private.scheduled_scope(p,uid,cid,sid);
   answer:=public.ders_action('assign_program',jsonb_build_object('student_id',sid,'week_name',doc->>'week_name','week_range',to_char(first_day,'DD.MM.YYYY')||' – '||to_char(last_day,'DD.MM.YYYY'),'quests',doc->'quests'));
   if answer ? 'error' then raise exception '%',answer->>'error';end if;aid:=(answer->>'assignment_id')::uuid;if aid is null then raise exception 'Atama sonucu doğrulanamadı.';end if;
   if cid is not null then insert into public.class_program_recipients(program_id,class_id,student_id,assignment_id) values(did,cid,sid,aid);end if;
  exception when others then aid:=null;error_message:=left(sqlerrm,500);
  end;
  insert into public.teacher_program_receipts(dispatch_id,student_id,assignment_id,status,error) values(did,sid,aid,case when aid is null then 'failed' else 'sent' end,error_message)
   on conflict(dispatch_id,student_id) do update set assignment_id=excluded.assignment_id,status=excluded.status,error=excluded.error,attempts=teacher_program_receipts.attempts+1,updated_at=now();
 end loop;
 select count(*) filter(where status='sent'),count(*) filter(where status='failed') into sent,failed from public.teacher_program_receipts where dispatch_id=did;
 update public.teacher_program_dispatches set status=case when failed=0 then 'sent' when sent>0 then 'partial_failed' else 'failed' end,updated_at=now() where id=did;
 return ders_workspace_private.dispatch_result(did);
end $$;

alter function ders_workspace_private.action(text,jsonb) rename to action_m5;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action in('schedule_health','schedule_list','schedule_get','schedule_save','schedule_cancel') then return ders_workspace_private.schedule_action(p_action,p);end if;
 if p_action='send_program' and exists(select 1 from public.teacher_scheduled_programs where dispatch_id=(p->>'id')::uuid) then raise exception 'Zamanlanmış gönderimi planlama panelinden yönet.' using errcode='42501';end if;
 return ders_workspace_private.action_m5(p_action,p);
end $$;
revoke all on function ders_workspace_private.scheduler_active(),ders_workspace_private.scheduled_scope(jsonb,uuid,uuid,uuid),ders_workspace_private.schedule_document(jsonb),ders_workspace_private.schedule_action(text,jsonb),ders_workspace_private.run_due(int),ders_workspace_private.action_m5(text,jsonb) from public,anon,authenticated;
revoke all on function ders_workspace_private.action(text,jsonb) from public,anon;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
do $cron$ begin
 if to_regprocedure('cron.schedule(text,text,text)') is not null then
  if exists(select 1 from cron.job where jobname='ders-v150-program-dispatch' and username=current_user and command<>'select ders_workspace_private.run_due(2)') then raise exception 'Cron job name is already used by a different command; stop and inspect.';end if;
  perform cron.schedule('ders-v150-program-dispatch','* * * * *','select ders_workspace_private.run_due(2)');
 else raise notice 'Cron is not enabled. Scheduling stays unavailable until the server-only activation step.';end if;
end $cron$;
notify pgrst,'reload schema';

do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-M6';
end $verify$;

drop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;

-- M7
set local lock_timeout='5s';
do $guard$ begin
 if to_regclass('public.teacher_scheduled_programs') is null or to_regprocedure('ders_workspace_private.action_center(uuid)') is not null then raise exception 'Unexpected workspace schema; inspect before migration';end if;
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
 insert into ders_release_private.app_snapshots(version,data) values('1.5.0-M7',snapshot||jsonb_build_object('_checks',(select b.data from pg_temp.v150_workspace_before b),
 '_functions',(select coalesce(jsonb_object_agg(n.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',pg_get_functiondef(f.oid)),'{}') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_function_acl',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',f.proname,'arguments',pg_get_function_identity_arguments(f.oid),'owner',pg_get_userbyid(f.proowner),'acl',f.proacl)),'[]') from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname in('public','ders_private','ders_class_private','ders_workspace_private','ders_learning_private','ders_exams_private') and f.prokind in('f','p')),
 '_scope','Additive teacher-only workspace storage and tools; existing user rows and RLS must remain unchanged'));
end $backup$;
-- Lightweight, teacher-only action-center reads. Existing user rows and policies are untouched.
create index workspace_drafts_student_fk on public.teacher_workspace_drafts(student_id);
create index class_membership_period_student_fk on ders_class_private.membership_periods(student_id);
create index class_connection_period_student_fk on ders_class_private.connection_periods(student_id);
create function ders_workspace_private.action_center(cid uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();today date:=(now() at time zone 'Europe/Istanbul')::date;week date:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date;result jsonb;begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') or cid is not null and not ders_class_private.is_teacher(cid) then raise exception 'Yalnızca sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 with owned as (select * from public.school_classes where teacher_id=uid and archived_at is null and (cid is null or id=cid)), rows as (
  select c.id,c.name,
   (select count(*) from public.class_requests r where r.class_id=c.id and r.kind='join' and r.status='pending') joins,
   (select count(*) from public.class_program_recipients r join public.class_programs cp on cp.id=r.program_id join public.teacher_plan_assignments a on a.id=r.assignment_id where r.class_id=c.id and cp.cancelled_at is null and a.status='pending' and a.archived_at is null and ders_class_private.is_member(c.id,a.student_id)) pending,
   (select count(*) from public.quest_change_requests cr join public.teacher_assigned_quests q on q.id=cr.quest_id join public.class_program_recipients r on r.assignment_id=q.assignment_id where r.class_id=c.id and cr.teacher_id=uid and cr.status='pending' and ders_class_private.is_member(c.id,cr.student_id)) changes,
   (select count(*) from public.teacher_scheduled_programs j where j.teacher_id=uid and j.body->>'class_id'=c.id::text and j.status in('scheduled','retry_wait')) schedules,
   (select count(*) from public.class_program_recipients r join public.class_programs cp on cp.id=r.program_id join public.teacher_plan_assignments a on a.id=r.assignment_id where r.class_id=c.id and cp.starts_on<=week+6 and cp.ends_on>=week and cp.cancelled_at is null and a.status='accepted' and a.archived_at is null and ders_class_private.is_member(c.id,a.student_id) and ders_class_private.eligible_record(c.id,a.student_id,a.created_at,a.created_at)
    and exists(select 1 from public.teacher_assigned_quests q where q.assignment_id=a.id and q.archived_at is null) and not exists(select 1 from public.teacher_assigned_quests q where q.assignment_id=a.id and q.archived_at is null and ders_class_private.quest_count(a.student_id,a.id,q)>0)) not_started,
   (select count(*) from public.class_shared_tasks t where t.class_id=c.id and t.status='open' and t.ends_on between today and today+7) shared_due,
   case when (c.created_at at time zone 'Europe/Istanbul')::date<=week-1 then 1 else 0 end reports
  from owned c
 ) select jsonb_build_object('classes',coalesce(jsonb_agg(r order by r.name,r.id),'[]'),'report_week',week-7,'server_time',now(),'time_zone','Europe/Istanbul') into result from rows r;return result;
end $$;
alter function ders_workspace_private.action(text,jsonb) rename to action_m6;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action='action_center' then return ders_workspace_private.action_center(nullif(p->>'class_id','')::uuid);end if;
 return ders_workspace_private.action_m6(p_action,p);
end $$;
revoke all on function ders_workspace_private.action_center(uuid),ders_workspace_private.action_m6(text,jsonb) from public,anon,authenticated;
revoke all on function ders_workspace_private.action(text,jsonb) from public,anon;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';

do $verify$ begin
 if pg_temp.v150_workspace_fingerprint() is distinct from (select data from pg_temp.v150_workspace_before) then raise exception 'Existing data or RLS changed; rollback workspace migration';end if;
 update ders_release_private.app_snapshots set data=data||jsonb_build_object('_validated',true) where version='1.5.0-M7';
end $verify$;

drop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;

commit;
-- Completion check (no user data):
select version,data->>'_validated' as preserved from ders_release_private.app_snapshots where version in('1.5.0-M3','1.5.0-M4','1.5.0-M5','1.5.0-M6','1.5.0-M7') order by version;
