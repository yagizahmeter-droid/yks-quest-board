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
