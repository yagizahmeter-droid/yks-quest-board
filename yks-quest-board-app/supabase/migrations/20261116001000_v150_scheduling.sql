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
