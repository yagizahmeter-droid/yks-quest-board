begin;

-- Keep the original board byte-for-byte and capture a private pre-upgrade snapshot.
create temporary table ders_upgrade_board_check on commit drop as
select user_id,md5(state::text) as state_hash,version from public.quest_board_states;
create table ders_private.teacher_update_backups (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  snapshot jsonb not null
);
alter table ders_private.teacher_update_backups enable row level security;
revoke all on ders_private.teacher_update_backups from public,anon,authenticated;
insert into ders_private.teacher_update_backups(snapshot) select jsonb_build_object(
  'boards',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.quest_board_states t),
  'profiles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.user_profiles t),
  'connections',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.student_teacher_connections t),
  'assignments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.teacher_plan_assignments t),
  'quests',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.teacher_assigned_quests t),
  'requests',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.quest_change_requests t),
  'invites',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from ders_private.teacher_invite_codes t),
  'action_definition',pg_get_functiondef('ders_private.action(text,jsonb)'::regprocedure)
);

alter table public.teacher_assigned_quests
  add column exam_type text check(exam_type in ('TYT','AYT','KPSS')),
  add column repeat_kind text not null default 'none' check(repeat_kind in ('none','weekly','daily')),
  add column repeat_target integer not null default 1 check(repeat_target between 1 and 100),
  add column starts_on date,
  add column ends_on date,
  add constraint daily_repeat_window check(repeat_kind<>'daily' or
    (starts_on is not null and ends_on is not null and ends_on>=starts_on and ends_on-starts_on<31
     and repeat_target=ends_on-starts_on+1));
alter table public.teacher_plan_assignments drop constraint teacher_plan_assignments_status_check;
alter table public.teacher_plan_assignments add constraint teacher_plan_assignments_status_check
  check(status in ('pending','accepted','rejected','withdrawn'));

create table public.quest_completion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  quest_id uuid not null references public.teacher_assigned_quests(id),
  request_id uuid not null,
  kind text not null check(kind in ('weekly','daily')),
  occurrence integer not null check(occurrence>0),
  occurrence_date date not null,
  xp integer not null check(xp between 5 and 10000),
  history_record jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(user_id,request_id), unique(user_id,quest_id,occurrence)
);
create unique index daily_completion_once on public.quest_completion_events(user_id,quest_id,occurrence_date)
where kind='daily';
create index completion_quest_owner on public.quest_completion_events(quest_id,user_id);
alter table public.quest_completion_events enable row level security;
revoke all on public.quest_completion_events from public,anon,authenticated;
grant select on public.quest_completion_events to authenticated;
create policy completion_owner_or_connected_teacher on public.quest_completion_events for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.student_teacher_connections c
  where c.student_id=user_id and c.teacher_id=(select auth.uid()) and c.status='approved'));

create function ders_private.quest_day() returns date language sql stable set search_path='' as
$$ select (current_timestamp at time zone 'Europe/Istanbul')::date $$;
revoke all on function ders_private.quest_day() from public,anon,authenticated;

create function ders_private.repeat_projection(p_quest uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select (case when q.exam_type is null then '{}'::jsonb else jsonb_build_object('examType',q.exam_type) end) ||
 case when q.repeat_kind='none' then '{}'::jsonb else jsonb_build_object(
   'repeat',jsonb_build_object('kind',q.repeat_kind,'target',q.repeat_target,'startDate',q.starts_on,'endDate',q.ends_on),
   'completions',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'date',e.occurrence_date,
     'xp',e.xp,'occurrence',e.occurrence,'completedAt',e.created_at) order by e.occurrence)
     from public.quest_completion_events e where e.quest_id=q.id),'[]'::jsonb),
   'done',(select count(*)>=q.repeat_target from public.quest_completion_events e where e.quest_id=q.id),
   'completionId',null) end
 from public.teacher_assigned_quests q where q.id=p_quest
$$;
revoke all on function ders_private.repeat_projection(uuid) from public,anon,authenticated;

create function ders_private.refresh_repeat_board(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare board jsonb; weeks jsonb; histories jsonb;
begin
 select state into board from public.quest_board_states where user_id=p_user for update;
 if board is null then return; end if;
 select jsonb_agg(w.value || jsonb_build_object('quests',coalesce((
   select jsonb_agg(x.value || coalesce((select ders_private.repeat_projection(t.id)
     from public.teacher_assigned_quests t join public.teacher_plan_assignments a on a.id=t.assignment_id
     where a.student_id=p_user and a.status='accepted' and x.value->>'id'='teacher-quest-'||t.id),'{}'::jsonb)
     order by x.ordinality) from jsonb_array_elements(w.value->'quests') with ordinality x
   ),'[]'::jsonb)) order by w.ordinality) into weeks
 from jsonb_array_elements(board->'weeks') with ordinality w;
 select coalesce(jsonb_agg(h.value order by h.ordinality),'[]'::jsonb) into histories
 from jsonb_array_elements(coalesce(board->'studyHistory','[]')) with ordinality h
 where not exists(select 1 from public.quest_completion_events e where e.user_id=p_user and h.value->>'id'=e.history_record->>'id');
 select histories || coalesce(jsonb_agg(e.history_record order by e.created_at,e.id),'[]'::jsonb) into histories
 from public.quest_completion_events e where e.user_id=p_user;
 update public.quest_board_states set state=jsonb_set(jsonb_set(board,'{weeks}',weeks),'{studyHistory}',histories),
   updated_at=clock_timestamp(),version=greatest(version+1,(extract(epoch from clock_timestamp())*1000)::bigint)
 where user_id=p_user;
end $$;
revoke all on function ders_private.refresh_repeat_board(uuid) from public,anon,authenticated;

create function ders_private.protect_repeat_records() returns trigger
language plpgsql security definer set search_path='' as $$
declare q record; entry jsonb; expected jsonb; e record; amount integer;
begin
 for q in select t.id,t.repeat_kind,t.exam_type from public.teacher_assigned_quests t
   join public.teacher_plan_assignments a on a.id=t.assignment_id
   where a.student_id=new.user_id and a.status='accepted' and (t.repeat_kind<>'none' or t.exam_type is not null) loop
   select jsonb_agg(x)->0 into entry from jsonb_array_elements(new.state->'weeks') w,
     jsonb_array_elements(w->'quests') x where x->>'id'='teacher-quest-'||q.id;
   expected:=ders_private.repeat_projection(q.id);
   if (expected ? 'examType' and entry->'examType' is distinct from expected->'examType') or
     (q.repeat_kind<>'none' and (entry->'repeat' is distinct from expected->'repeat'
      or entry->'completions' is distinct from expected->'completions'
      or entry->'done' is distinct from expected->'done' or entry->'completionId' is distinct from 'null'::jsonb))
   then raise exception 'Tekrar sayacı ve XP kayıtları yalnızca sunucuda güncellenebilir.' using errcode='42501'; end if;
 end loop;
 for e in select history_record from public.quest_completion_events where user_id=new.user_id loop
   select count(*),jsonb_agg(h)->0 into amount,entry from jsonb_array_elements(coalesce(new.state->'studyHistory','[]')) h
   where h->>'id'=e.history_record->>'id';
   if amount<>1 or entry is distinct from e.history_record then
     raise exception 'Tekrar geçmişi doğrudan değiştirilemez.' using errcode='42501'; end if;
 end loop;
 return new;
end $$;
revoke all on function ders_private.protect_repeat_records() from public,anon,authenticated;
create trigger protect_repeat_records before insert or update on public.quest_board_states
for each row execute function ders_private.protect_repeat_records();

create function ders_private.archive_signature(p_week jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',p_week->'id','name',p_week->'name','range',p_week->'range',
   'quests',coalesce((select jsonb_agg(jsonb_build_object('id',q->'id','title',q->'title','detail',q->'detail',
     'xp',q->'xp','done',coalesce(q->'done','false'::jsonb),'completionId',coalesce(q->'completionId','null'::jsonb),
     'categoryId',coalesce(q->'categoryId',q->'subject'),'repeat',q->'repeat','completions',q->'completions') order by q->>'id')
     from jsonb_array_elements(p_week->'quests') q),'[]'::jsonb))
$$;
revoke all on function ders_private.archive_signature(jsonb) from public,anon,authenticated;

alter function ders_private.action(text,jsonb) rename to action_v1;
revoke all on function ders_private.action_v1(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role_name text; result jsonb; board jsonb; old_board jsonb; item jsonb;
 a public.teacher_plan_assignments%rowtype; q public.teacher_assigned_quests%rowtype;
 e public.quest_completion_events%rowtype; previous_ids uuid[]; aid uuid; wid text; catid text;
 cats jsonb; newquests jsonb:='[]'; histories jsonb; day date; amount integer; target integer;
 event_id uuid; request_key uuid; history jsonb; stamp timestamptz; chosen text; i integer;
begin
 if uid is null then raise exception 'Giriş yapmalısın.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 select role into role_name from public.user_profiles where id=uid;
 if p_action='overview' then
   return ders_private.action_v1(p_action,p_payload)||jsonb_build_object('server_now',clock_timestamp(),
     'today',ders_private.quest_day(),'capabilities',jsonb_build_object('repeatQuests',true,'withdrawProgram',true,'archiveWeek',true));
 elsif p_action='withdraw_assignment' then
   select * into a from public.teacher_plan_assignments where id=(p_payload->>'id')::uuid for update;
   if not found or a.teacher_id<>uid or role_name<>'teacher' then raise exception 'Bu isteğe erişim yetkin yok.' using errcode='42501'; end if;
   if a.status<>'pending' then raise exception 'Yalnızca bekleyen program isteği geri çekilebilir.'; end if;
   update public.teacher_plan_assignments set status='withdrawn',responded_at=now() where id=a.id;
   return jsonb_build_object('ok',true);
 elsif p_action='assign_program' then
   if jsonb_typeof(p_payload->'quests') is distinct from 'array' then raise exception 'Görev listesi gerekli.'; end if;
   for item in select value from jsonb_array_elements(p_payload->'quests') loop
     if item ? 'exam_type' and item->>'exam_type' not in ('TYT','AYT','KPSS') then raise exception 'Geçersiz sınav türü.'; end if;
     chosen:=coalesce(item->>'repeat_kind','none');target:=coalesce((item->>'repeat_target')::integer,1);
     if chosen not in ('none','weekly','daily') or target not between 1 and 100 then raise exception 'Geçersiz tekrar türü veya hedefi.'; end if;
     if chosen='daily' and (item->>'starts_on' is null or item->>'ends_on' is null or
       (item->>'ends_on')::date<(item->>'starts_on')::date or (item->>'ends_on')::date-(item->>'starts_on')::date>=31 or
       target<>(item->>'ends_on')::date-(item->>'starts_on')::date+1) then raise exception 'Günlük görev için 1–31 günlük tarih aralığı gerekli.'; end if;
   end loop;
   select coalesce(array_agg(id),'{}'::uuid[]) into previous_ids from public.teacher_plan_assignments where teacher_id=uid;
   result:=ders_private.action_v1(p_action,p_payload);
   select id into aid from public.teacher_plan_assignments where teacher_id=uid and not(id=any(previous_ids));
   if aid is null then raise exception 'Program oluşturulamadı.'; end if;
   update public.teacher_assigned_quests t set exam_type=p_payload->'quests'->t.sort_order->>'exam_type',
     repeat_kind=coalesce(p_payload->'quests'->t.sort_order->>'repeat_kind','none'),
     repeat_target=case when coalesce(p_payload->'quests'->t.sort_order->>'repeat_kind','none')='none' then 1
       else coalesce((p_payload->'quests'->t.sort_order->>'repeat_target')::integer,1) end,
     starts_on=case when p_payload->'quests'->t.sort_order->>'repeat_kind'='daily' then (p_payload->'quests'->t.sort_order->>'starts_on')::date end,
     ends_on=case when p_payload->'quests'->t.sort_order->>'repeat_kind'='daily' then (p_payload->'quests'->t.sort_order->>'ends_on')::date end
   where t.assignment_id=aid;
   return result||jsonb_build_object('assignment_id',aid);
 elsif p_action='respond_assignment' then
   select * into a from public.teacher_plan_assignments where id=(p_payload->>'id')::uuid for update;
   if not found or a.student_id<>uid or a.status<>'pending' or p_payload->>'status' not in ('accepted','rejected')
     or not exists(select 1 from public.student_teacher_connections where teacher_id=a.teacher_id and student_id=uid and status='approved')
   then raise exception 'Bu programa yanıt veremezsin.' using errcode='42501'; end if;
   if p_payload->>'status'='rejected' then
     update public.teacher_plan_assignments set status='rejected',responded_at=now() where id=a.id;
     return jsonb_build_object('ok',true);
   end if;
   wid:='teacher-week-'||a.id;
   select state into board from public.quest_board_states where user_id=uid for update;
   board:=coalesce(board,jsonb_build_object('weeks','[]'::jsonb,'categories','[]'::jsonb,'studyHistory','[]'::jsonb));
   cats:=coalesce(board->'categories','[]');
   for q in select * from public.teacher_assigned_quests where assignment_id=a.id order by sort_order loop
     catid:='teacher-cat-'||a.id||'-'||md5(q.category_name);
     if not exists(select 1 from jsonb_array_elements(cats) x where x->>'id'=catid) then
       cats:=cats||jsonb_build_array(jsonb_build_object('id',catid,'key',catid,'name',q.category_name,'color','#63d6d6','sortOrder',jsonb_array_length(cats)*10));
     end if;
     newquests:=newquests||jsonb_build_array(jsonb_build_object('id','teacher-quest-'||q.id,'categoryId',catid,'subject',catid,
       'title',q.title,'detail',q.detail,'xp',q.xp,'done',false,'sortOrder',q.sort_order,'source','teacher_assigned',
       'sourceDay','Öğretmen atadı','lockedForStudent',true,'assignedQuestId',q.id,'assignedByTeacherId',a.teacher_id)||ders_private.repeat_projection(q.id));
   end loop;
   board:=jsonb_set(jsonb_set(board,'{weeks}',coalesce(board->'weeks','[]')||jsonb_build_array(
     jsonb_build_object('id',wid,'name',a.week_name,'range',a.week_range,'quests',newquests))),'{categories}',cats);
   board:=jsonb_set(board,'{activeWeekId}',to_jsonb(wid));
   update public.teacher_plan_assignments set status='accepted',week_id=wid,responded_at=now() where id=a.id;
   insert into public.quest_board_states(user_id,state,updated_at,version) values(uid,board,clock_timestamp(),(extract(epoch from clock_timestamp())*1000)::bigint)
   on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at,version=greatest(quest_board_states.version+1,excluded.version);
   return jsonb_build_object('ok',true);
 elsif p_action='complete_repeat' then
   select * into q from public.teacher_assigned_quests where id=(p_payload->>'quest_id')::uuid for update;
   select * into a from public.teacher_plan_assignments where id=q.assignment_id;
   if not found or a.student_id is distinct from uid or a.status<>'accepted' or q.repeat_kind='none'
   then raise exception 'Bu görevi tamamlayamazsın.' using errcode='42501'; end if;
   select state into board from public.quest_board_states where user_id=uid for update;
   if exists(select 1 from jsonb_array_elements(board->'weeks') w where w->>'id'=a.week_id and w->>'archived'='true')
   then return jsonb_build_object('status','archived'); end if;
   request_key:=(p_payload->>'request_id')::uuid;
   if request_key is null then raise exception 'İşlem kimliği gerekli.'; end if;
   select * into e from public.quest_completion_events where user_id=uid and request_id=request_key;
   if found then
     if e.quest_id<>q.id then raise exception 'İşlem kimliği başka göreve ait.' using errcode='42501'; end if;
     return jsonb_build_object('status','completed','duplicate',true,'xp',e.xp);
   end if;
   day:=ders_private.quest_day();
   select count(*) into amount from public.quest_completion_events where user_id=uid and quest_id=q.id;
   if q.repeat_kind='daily' then
     if p_payload->>'expected_date' is distinct from day::text then return jsonb_build_object('status','expired','today',day); end if;
     if day<q.starts_on or day>q.ends_on then return jsonb_build_object('status','outside_window','today',day); end if;
     if exists(select 1 from public.quest_completion_events where user_id=uid and quest_id=q.id and occurrence_date=day)
     then return jsonb_build_object('status','already_completed','today',day); end if;
   end if;
   if amount>=q.repeat_target then return jsonb_build_object('status','target_reached'); end if;
   event_id:=gen_random_uuid();stamp:=clock_timestamp();catid:='teacher-cat-'||a.id||'-'||md5(q.category_name);
   history:=jsonb_build_object('id','repeat-event-'||event_id,'userId',uid,'questId','teacher-quest-'||q.id,
     'categoryId',catid,'categoryName',q.category_name,'title',q.title,'detail',q.detail,'xp',q.xp,'completedAt',stamp,
     'weekId',a.week_id,'weekName',a.week_name,'source','teacher_assigned','repeatKind',q.repeat_kind,'occurrenceDate',day);
   insert into public.quest_completion_events(id,user_id,quest_id,request_id,kind,occurrence,occurrence_date,xp,history_record,created_at)
   values(event_id,uid,q.id,request_key,q.repeat_kind,amount+1,day,q.xp,history,stamp);
   perform ders_private.refresh_repeat_board(uid);
   return jsonb_build_object('status','completed','xp',q.xp,'today',day);
 elsif p_action='archive_week' then
   select state into board from public.quest_board_states where user_id=uid for update;
   wid:=p_payload->>'week_id';
   if board is null or not exists(select 1 from jsonb_array_elements(board->'weeks') w where w->>'id'=wid)
   then raise exception 'Hafta bulunamadı.' using errcode='42501'; end if;
   select jsonb_agg(case when w->>'id'=wid then w||jsonb_build_object('archived',true) else w end) into newquests
   from jsonb_array_elements(board->'weeks') w;
   select w->>'id' into chosen from jsonb_array_elements(newquests) w where w->>'archived' is distinct from 'true' limit 1;
   if chosen is null then
     chosen:='week-'||gen_random_uuid();newquests:=newquests||jsonb_build_array(jsonb_build_object('id',chosen,'name','Yeni Hafta','range','','quests','[]'::jsonb));
   end if;
   board:=jsonb_set(board,'{weeks}',newquests);
   if board->>'activeWeekId'=wid then board:=jsonb_set(board,'{activeWeekId}',to_jsonb(chosen)); end if;
   update public.quest_board_states set state=board,updated_at=clock_timestamp(),version=greatest(version+1,(extract(epoch from clock_timestamp())*1000)::bigint) where user_id=uid;
   return jsonb_build_object('ok',true);
 elsif p_action='sync_board' then
   select state into old_board from public.quest_board_states where user_id=uid for update;
   -- A stale device first receives the canonical state before archive validation.
   if old_board is not null and (select version from public.quest_board_states where user_id=uid)<>coalesce((p_payload->>'expected_version')::bigint,0)
   then return ders_private.action_v1(p_action,p_payload); end if;
   for item in select value from jsonb_array_elements(coalesce(old_board->'weeks','[]')) where value->>'archived'='true' loop
     if not exists(select 1 from jsonb_array_elements(p_payload->'state'->'weeks') w where w->>'id'=item->>'id' and w->>'archived'='true'
       and ders_private.archive_signature(w)=ders_private.archive_signature(item))
     then raise exception 'Arşivlenen haftanın XP ve geçmiş kayıtları değiştirilemez.' using errcode='42501'; end if;
   end loop;
   for item in select h from jsonb_array_elements(coalesce(old_board->'studyHistory','[]')) h where exists(
     select 1 from jsonb_array_elements(old_board->'weeks') w where w->>'archived'='true' and h->>'weekId'=w->>'id') loop
     if (select count(*) from jsonb_array_elements(coalesce(p_payload->'state'->'studyHistory','[]')) h where h=item)<>1
     then raise exception 'Arşivlenen haftanın çalışma geçmişi korunmalıdır.' using errcode='42501'; end if;
   end loop;
 elsif p_action in ('request_change','resolve_change') then
   if p_action='request_change' then select * into q from public.teacher_assigned_quests where id=(p_payload->>'quest_id')::uuid;
   else select t.* into q from public.teacher_assigned_quests t join public.quest_change_requests r on r.quest_id=t.id where r.id=(p_payload->>'id')::uuid; end if;
   select * into a from public.teacher_plan_assignments where id=q.assignment_id;
   if a.id is null or (p_action='request_change' and a.student_id is distinct from uid) or
      (p_action='resolve_change' and (a.teacher_id is distinct from uid or role_name is distinct from 'teacher')) or
      not exists(select 1 from public.student_teacher_connections c where c.student_id=a.student_id and c.teacher_id=a.teacher_id and c.status='approved')
   then raise exception 'Bu göreve erişim yetkin yok.' using errcode='42501'; end if;
   -- Serialize teacher edits with the student's completion and archival operations.
   perform pg_advisory_xact_lock(hashtextextended(a.student_id::text,43));
   if exists(select 1 from public.quest_board_states s,jsonb_array_elements(s.state->'weeks') w where s.user_id=a.student_id and w->>'id'=a.week_id and w->>'archived'='true')
   then raise exception 'Arşivlenmiş görev değiştirilemez.'; end if;
 end if;
 return ders_private.action_v1(p_action,p_payload);
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
create or replace function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_private.action(p_action,p_payload); $$;
revoke all on function public.ders_action(text,jsonb) from public,anon;
grant execute on function public.ders_action(text,jsonb) to authenticated;

do $$ begin
 if exists(select 1 from ders_upgrade_board_check b full join public.quest_board_states s using(user_id)
   where b.user_id is null or s.user_id is null or b.state_hash<>md5(s.state::text) or b.version<>s.version)
 then raise exception 'Migration mevcut board verisini değiştirdi; işlem geri alındı.'; end if;
end $$;
notify pgrst,'reload schema';
commit;
