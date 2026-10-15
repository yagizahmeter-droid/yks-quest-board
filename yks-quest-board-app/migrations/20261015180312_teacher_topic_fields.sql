begin;
lock table public.quest_board_states,public.teacher_assigned_quests in share row exclusive mode;
create temporary table topic_board_before on commit drop as select user_id,state,version from public.quest_board_states;
create temporary table topic_quests_before on commit drop as select id,to_jsonb(q) as row_data from public.teacher_assigned_quests q;
insert into ders_private.teacher_update_backups(snapshot) select jsonb_build_object(
 'upgrade','teacher_topic_fields',
 'boards',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.quest_board_states t),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.user_profiles t),
 'connections',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.student_teacher_connections t),
 'assignments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.teacher_plan_assignments t),
 'quests',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.teacher_assigned_quests t),
 'requests',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.quest_change_requests t),
 'events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.quest_completion_events t),
 'invites',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from ders_private.teacher_invite_codes t),
 'action_definition',pg_get_functiondef('ders_private.action(text,jsonb)'::regprocedure),
 'projection_definition',pg_get_functiondef('ders_private.repeat_projection(uuid)'::regprocedure));

alter table public.teacher_assigned_quests add column topic_category text,add column topic_name text,add column topic_scope text,
 add constraint teacher_topic_fields_valid check(
  (topic_scope is null and topic_category is null and topic_name is null) or
  (topic_scope is not null and exam_type is not null and coalesce(length(btrim(topic_category)),0) between 1 and 200 and
   ((topic_scope='category' and topic_name is null) or (topic_scope='topic' and coalesce(length(btrim(topic_name)),0) between 1 and 200))));

create function ders_private.derive_topic_title() returns trigger language plpgsql set search_path='' as $$
begin
 if new.topic_scope='category' then new.title:=btrim(new.topic_category);
 elsif new.topic_scope='topic' then new.title:=btrim(new.topic_name); end if;
 return new;
end $$;
revoke all on function ders_private.derive_topic_title() from public,anon,authenticated;
create trigger derive_topic_title before insert or update on public.teacher_assigned_quests
for each row execute function ders_private.derive_topic_title();

create or replace function ders_private.repeat_projection(p_quest uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select (case when q.exam_type is null then '{}'::jsonb else jsonb_build_object('examType',q.exam_type) end) ||
 (case when q.topic_scope is null then '{}'::jsonb else jsonb_build_object(
  'topicCategory',q.topic_category,'topicName',q.topic_name,'topicScope',q.topic_scope) end) ||
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

create function ders_private.protect_topic_fields() returns trigger
language plpgsql security definer set search_path='' as $$
declare q record; entry jsonb; amount integer;
begin
 for q in select t.* from public.teacher_assigned_quests t join public.teacher_plan_assignments a on a.id=t.assignment_id
  where a.student_id=new.user_id and a.status='accepted' and t.topic_scope is not null loop
  select count(*),jsonb_agg(x)->0 into amount,entry from jsonb_array_elements(new.state->'weeks') w,
   jsonb_array_elements(w->'quests') x where x->>'id'='teacher-quest-'||q.id;
  if amount<>1 or entry->>'title' is distinct from q.title or entry->>'topicCategory' is distinct from q.topic_category
   or entry->'topicName' is distinct from coalesce(to_jsonb(q.topic_name),'null'::jsonb)
   or entry->>'topicScope' is distinct from q.topic_scope then
   raise exception 'Öğretmen görevinin konu ve kapsam alanları doğrudan değiştirilemez.' using errcode='42501';
  end if;
 end loop;
 return new;
end $$;
revoke all on function ders_private.protect_topic_fields() from public,anon,authenticated;
create trigger protect_topic_fields before insert or update on public.quest_board_states
for each row execute function ders_private.protect_topic_fields();

alter function ders_private.action(text,jsonb) rename to action_before_topics;
revoke all on function ders_private.action_before_topics(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; item jsonb; items jsonb:='[]'; scope text; title text; q public.teacher_assigned_quests%rowtype;
begin
 if uid is null then raise exception 'Giriş yapmalısın.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 if p_action='assign_program' then
  if not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501'; end if;
  if jsonb_typeof(p_payload->'quests') is distinct from 'array' then raise exception 'Görev listesi gerekli.'; end if;
  for item in select value from jsonb_array_elements(p_payload->'quests') loop
   if item ? 'topic_scope' then
    scope:=item->>'topic_scope';
    if scope is null or scope not in ('topic','category') or item->>'exam_type' is null or
     jsonb_typeof(item->'topic_category') is distinct from 'string' or coalesce(length(btrim(item->>'topic_category')),0) not between 1 and 200 or
     (scope='topic' and (jsonb_typeof(item->'topic_name') is distinct from 'string' or coalesce(length(btrim(item->>'topic_name')),0) not between 1 and 200)) or
     (scope='category' and item->'topic_name' is distinct from 'null'::jsonb) then raise exception 'Geçerli kategori, alt konu ve kapsam gerekli.'; end if;
    title:=case when scope='category' then btrim(item->>'topic_category') else btrim(item->>'topic_name') end;
    item:=item||jsonb_build_object('title',title,'topic_category',btrim(item->>'topic_category'),'topic_name',case when scope='topic' then btrim(item->>'topic_name') end);
   elsif item ? 'topic_category' or item ? 'topic_name' then raise exception 'Konu kapsamı gerekli.'; end if;
   items:=items||jsonb_build_array(item);
  end loop;
  p_payload:=jsonb_set(p_payload,'{quests}',items);
 elsif p_action='request_change' then
  select t.* into q from public.teacher_assigned_quests t join public.teacher_plan_assignments a on a.id=t.assignment_id
   where t.id=(p_payload->>'quest_id')::uuid and a.student_id=uid and a.status='accepted'
   and exists(select 1 from public.student_teacher_connections c where c.student_id=uid and c.teacher_id=a.teacher_id and c.status='approved');
  if q.topic_scope is not null and p_payload->'changes'->>'title' is distinct from q.title then
   raise exception 'Görev adı konu seçiminden üretilir. Açıklama veya XP değişikliği isteyebilirsin.';
  end if;
 end if;
 result:=ders_private.action_before_topics(p_action,p_payload);
 if p_action='assign_program' then
  update public.teacher_assigned_quests t set topic_category=p_payload->'quests'->t.sort_order->>'topic_category',
   topic_name=p_payload->'quests'->t.sort_order->>'topic_name',topic_scope=p_payload->'quests'->t.sort_order->>'topic_scope'
  where t.assignment_id=(result->>'assignment_id')::uuid and (p_payload->'quests'->t.sort_order) ? 'topic_scope';
 elsif p_action='overview' then result:=jsonb_set(result,'{capabilities}',coalesce(result->'capabilities','{}')||'{"topicCatalog":true}'::jsonb); end if;
 return result;
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
create or replace function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_private.action(p_action,p_payload); $$;
revoke all on function public.ders_action(text,jsonb) from public,anon;
grant execute on function public.ders_action(text,jsonb) to authenticated;

do $$ begin
 if exists(select 1 from topic_board_before b full join public.quest_board_states s using(user_id)
  where b.user_id is null or s.user_id is null or b.state is distinct from s.state or b.version is distinct from s.version)
 or exists(select 1 from topic_quests_before b full join public.teacher_assigned_quests s using(id)
  where b.id is null or s.id is null or b.row_data is distinct from (to_jsonb(s)-array['topic_category','topic_name','topic_scope']))
 then raise exception 'Konu alanı güncellemesi eski kayıtları değiştirdi; işlem geri alındı.'; end if;
end $$;
notify pgrst,'reload schema';
commit;
