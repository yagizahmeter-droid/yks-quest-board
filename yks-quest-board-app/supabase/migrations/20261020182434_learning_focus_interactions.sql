begin;
create schema if not exists ders_learning_private;
revoke all on schema ders_learning_private from public,anon,authenticated;
grant usage on schema ders_learning_private to authenticated;

create table public.study_segments (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 160), session_id uuid not null,
 week_id text, quest_id text, category_name text not null default 'Serbest Çalışma',
 started_at timestamptz not null, ended_at timestamptz not null,
 duration_ms bigint not null check(duration_ms between 1 and 28800000),
 created_at timestamptz not null default now(), primary key(user_id,id),
 check(ended_at>started_at),check(quest_id is null or week_id is not null)
);
create index study_segments_owner_date on public.study_segments(user_id,started_at);
create index study_segments_task on public.study_segments(user_id,week_id,quest_id);
create table public.task_messages (
 id uuid primary key,student_id uuid not null references auth.users(id),teacher_id uuid not null references public.user_profiles(id),
 week_id text not null,quest_id text not null,author_id uuid not null references auth.users(id),
 kind text not null check(kind in ('question','feedback','answer')),body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index task_messages_thread on public.task_messages(student_id,week_id,quest_id,created_at);
create index task_messages_teacher on public.task_messages(teacher_id,student_id);
create table public.week_reviews (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.user_profiles(id),student_id uuid not null references auth.users(id),
 week_id text not null,body text not null check(length(btrim(body)) between 1 and 8000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(teacher_id,student_id,week_id)
);
create index week_reviews_student on public.week_reviews(student_id,week_id);
create table public.notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 program boolean not null default true,feedback boolean not null default true,question boolean not null default true,review boolean not null default true
);
create table public.learning_notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,kind text not null check(kind in ('program','feedback','question','answer','review')),
 actor_id uuid not null references auth.users(id),student_id uuid not null references auth.users(id),
 week_id text,quest_id text,assignment_id uuid references public.teacher_plan_assignments(id),
 read_at timestamptz,created_at timestamptz not null default now(),unique(user_id,event_key)
);
create index learning_notifications_owner on public.learning_notifications(user_id,created_at desc);
create index learning_notifications_actor on public.learning_notifications(actor_id);
create index learning_notifications_student on public.learning_notifications(student_id);
create index learning_notifications_assignment on public.learning_notifications(assignment_id);
create index task_messages_author on public.task_messages(author_id);

create function ders_learning_private.can_read(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (auth.uid()=p_student or exists(select 1 from public.student_teacher_connections c
 join public.user_profiles p on p.id=c.teacher_id where c.student_id=p_student and c.teacher_id=auth.uid() and c.status='approved' and p.role='teacher'))
$$;
revoke all on function ders_learning_private.can_read(uuid) from public,anon;
grant execute on function ders_learning_private.can_read(uuid) to authenticated;
alter table public.study_segments enable row level security;
alter table public.task_messages enable row level security;
alter table public.week_reviews enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.learning_notifications enable row level security;
revoke all on public.study_segments,public.task_messages,public.week_reviews,public.notification_preferences,public.learning_notifications from public,anon,authenticated;
grant select on public.study_segments,public.task_messages,public.week_reviews,public.notification_preferences,public.learning_notifications to authenticated;
create policy study_read on public.study_segments for select to authenticated using(ders_learning_private.can_read(user_id));
create policy message_read on public.task_messages for select to authenticated using(student_id=(select auth.uid()) or (teacher_id=(select auth.uid()) and ders_learning_private.can_read(student_id)));
create policy review_read on public.week_reviews for select to authenticated using(student_id=(select auth.uid()) or (teacher_id=(select auth.uid()) and ders_learning_private.can_read(student_id)));
create policy preference_owner on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy notification_owner on public.learning_notifications for select to authenticated using(user_id=(select auth.uid()) and ders_learning_private.can_read(student_id));

create function ders_learning_private.task(p_student uuid,p_week text,p_quest text) returns jsonb
language sql stable security definer set search_path='' as $$
 select q from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w,jsonb_array_elements(w->'quests') q
 where b.user_id=p_student and w->>'id'=p_week and q->>'id'=p_quest limit 1
$$;
revoke all on function ders_learning_private.task(uuid,text,text) from public,anon,authenticated;
create function ders_learning_private.notify(p_user uuid,p_event text,p_kind text,p_actor uuid,p_student uuid,p_week text default null,p_quest text default null,p_assignment uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare prefs jsonb;
begin
 select to_jsonb(p) into prefs from public.notification_preferences p where user_id=p_user;
 if coalesce((prefs->>(case when p_kind='answer' then 'question' else p_kind end))::boolean,true) then
  insert into public.learning_notifications(user_id,event_key,kind,actor_id,student_id,week_id,quest_id,assignment_id)
  values(p_user,p_event,p_kind,p_actor,p_student,p_week,p_quest,p_assignment) on conflict(user_id,event_key) do nothing;
 end if;
end $$;
revoke all on function ders_learning_private.notify(uuid,text,text,uuid,uuid,text,text,uuid) from public,anon,authenticated;
create function ders_learning_private.program_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending' then perform ders_learning_private.notify(new.student_id,'program:'||new.id,'program',new.teacher_id,new.student_id,null,null,new.id);end if;
 return new;
end $$;
revoke all on function ders_learning_private.program_notice() from public,anon,authenticated;
create trigger learning_program_notice after insert on public.teacher_plan_assignments for each row execute function ders_learning_private.program_notice();

create function ders_learning_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid;tid uuid;wid text;qi text;q jsonb;b jsonb;s jsonb;v record;
 start_time timestamptz;end_time timestamptz;ms bigint;entry public.study_segments%rowtype;
 mid uuid;body_text text;k text;rid uuid;old_body text;result jsonb;
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 sid:=coalesce((p_payload->>'student_id')::uuid,uid);wid:=p_payload->>'week_id';qi:=p_payload->>'quest_id';
 if p_action='save_segments' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,113));
  if jsonb_typeof(p_payload->'segments') is distinct from 'array' or jsonb_array_length(p_payload->'segments')>100 then raise exception 'Geçersiz süre kayıtları.';end if;
  for s in select * from jsonb_array_elements(p_payload->'segments') loop
   start_time:=(s->>'started_at')::timestamptz;end_time:=(s->>'ended_at')::timestamptz;
   ms:=floor(extract(epoch from(end_time-start_time))*1000);
   if start_time is null or end_time is null or ms not between 1 and 28800000 or end_time>clock_timestamp()+interval '1 minute' then raise exception 'Geçersiz çalışma süresi.';end if;
   select * into entry from public.study_segments where user_id=uid and id=s->>'id';
   if found then
    if entry.started_at<>start_time or entry.ended_at<>end_time or entry.session_id<>(s->>'session_id')::uuid or entry.week_id is distinct from s->>'week_id' or entry.quest_id is distinct from s->>'quest_id' then raise exception 'Kayıt kimliği başka bir süre için kullanılmış.';end if;
    continue;
   end if;
   if exists(select 1 from public.study_segments where user_id=uid and started_at<end_time and ended_at>start_time) then raise exception 'Çakışan çalışma oturumu. Önce kayıtlarını yenile.';end if;
   k:='Serbest Çalışma';
   if s->>'quest_id' is not null then
    q:=ders_learning_private.task(uid,s->>'week_id',s->>'quest_id');
    if q is null then raise exception 'Görev artık bulunamıyor. Süre kaydı cihazında korunuyor.';end if;
    select c->>'name' into k from public.quest_board_states b,jsonb_array_elements(b.state->'categories') c where b.user_id=uid and c->>'id'=coalesce(q->>'categoryId',q->>'subject');
   elsif s->>'week_id' is not null and not exists(select 1 from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w where b.user_id=uid and w->>'id'=s->>'week_id') then raise exception 'Hafta bulunamadı.';end if;
   insert into public.study_segments(user_id,id,session_id,week_id,quest_id,category_name,started_at,ended_at,duration_ms)
   values(uid,s->>'id',(s->>'session_id')::uuid,s->>'week_id',s->>'quest_id',coalesce(k,'Belirtilmemiş'),start_time,end_time,ms);
  end loop;
  return jsonb_build_object('saved',true);
 elsif p_action in ('overview','report') then
  if not ders_learning_private.can_read(sid) then raise exception 'Bu öğrenciye erişim yetkin yok.' using errcode='42501';end if;
  select state into b from public.quest_board_states where user_id=sid;
  return jsonb_build_object('state',case when p_action='report' then b else null end,
   'segments',coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at) from public.study_segments x where user_id=sid),'[]'),
   'reviews',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('teacher_name',p.display_name) order by x.updated_at desc) from public.week_reviews x join public.user_profiles p on p.id=x.teacher_id where x.student_id=sid and (sid=uid or x.teacher_id=uid)),'[]'),
   'teachers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name)) from public.student_teacher_connections c join public.user_profiles p on p.id=c.teacher_id where c.student_id=sid and c.status='approved'),'[]'),
   'preferences',coalesce((select to_jsonb(p) from public.notification_preferences p where user_id=uid),'{"program":true,"feedback":true,"question":true,"review":true}'),
   'notifications',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.learning_notifications n where n.user_id=uid and ders_learning_private.can_read(n.student_id) order by n.created_at desc limit 100) x),'[]'));
 elsif p_action='messages' then
  if not ders_learning_private.can_read(sid) then raise exception 'Göreve erişim yok.' using errcode='42501';end if;
  return coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('author_name',p.display_name) order by m.created_at,m.id) from public.task_messages m join public.user_profiles p on p.id=m.author_id where m.student_id=sid and m.week_id=wid and m.quest_id=qi and (sid=uid or m.teacher_id=uid)),'[]');
 elsif p_action='message' then
  if not ders_learning_private.can_read(sid) or ders_learning_private.task(sid,wid,qi) is null then raise exception 'Göreve erişim yok.' using errcode='42501';end if;
  tid:=case when sid=uid then (p_payload->>'teacher_id')::uuid else uid end;
  if not exists(select 1 from public.student_teacher_connections c join public.user_profiles p on p.id=c.teacher_id where c.teacher_id=tid and c.student_id=sid and c.status='approved' and p.role='teacher') then raise exception 'Etkin öğretmen bağlantısı gerekli.' using errcode='42501';end if;
  mid:=(p_payload->>'id')::uuid;body_text:=btrim(p_payload->>'body');k:=case when sid=uid then 'question' when p_payload->>'kind'='answer' then 'answer' else 'feedback' end;
  insert into public.task_messages(id,student_id,teacher_id,week_id,quest_id,author_id,kind,body) values(mid,sid,tid,wid,qi,uid,k,body_text) on conflict(id) do nothing;
  if not exists(select 1 from public.task_messages where id=mid and author_id=uid and student_id=sid and teacher_id=tid and week_id=wid and quest_id=qi and body=body_text and kind=k) then raise exception 'Mesaj kimliği kullanılmış.';end if;
  perform ders_learning_private.notify(case when sid=uid then tid else sid end,'message:'||mid,k,uid,sid,wid,qi);
  return jsonb_build_object('saved',true);
 elsif p_action='review' then
  if sid=uid or not ders_learning_private.can_read(sid) then raise exception 'Öğretmen yetkisi gerekli.' using errcode='42501';end if;
  if not exists(select 1 from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w where b.user_id=sid and w->>'id'=wid) then raise exception 'Hafta bulunamadı.';end if;
  body_text:=btrim(p_payload->>'body');select body into old_body from public.week_reviews where teacher_id=uid and student_id=sid and week_id=wid;
  insert into public.week_reviews(teacher_id,student_id,week_id,body) values(uid,sid,wid,body_text)
   on conflict(teacher_id,student_id,week_id) do update set body=excluded.body,updated_at=case when week_reviews.body is distinct from excluded.body then clock_timestamp() else week_reviews.updated_at end returning id into rid;
  if old_body is distinct from body_text then perform ders_learning_private.notify(sid,'review:'||rid||':'||md5(body_text),'review',uid,sid,wid);end if;
  return jsonb_build_object('saved',true);
 elsif p_action='preferences' then
  insert into public.notification_preferences(user_id,program,feedback,question,review) values(uid,(p_payload->>'program')::boolean,(p_payload->>'feedback')::boolean,(p_payload->>'question')::boolean,(p_payload->>'review')::boolean)
   on conflict(user_id) do update set program=excluded.program,feedback=excluded.feedback,question=excluded.question,review=excluded.review;
  return jsonb_build_object('saved',true);
 elsif p_action='read_notification' then
  update public.learning_notifications set read_at=case when coalesce((p_payload->>'read')::boolean,true) then now() else null end where id=(p_payload->>'id')::uuid and user_id=uid and ders_learning_private.can_read(student_id);
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Bilinmeyen çalışma işlemi.';
end $$;
revoke all on function ders_learning_private.action(text,jsonb) from public,anon;
grant execute on function ders_learning_private.action(text,jsonb) to authenticated;
create function public.ders_learning(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ders_learning_private.action(p_action,p_payload)$$;
revoke all on function public.ders_learning(text,jsonb) from public,anon;
grant execute on function public.ders_learning(text,jsonb) to authenticated;
commit;
