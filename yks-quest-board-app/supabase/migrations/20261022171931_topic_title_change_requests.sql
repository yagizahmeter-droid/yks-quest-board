begin;
-- Add a task-local display override. No existing task, catalog, board or XP is rewritten.
alter table public.teacher_assigned_quests add column custom_title text
 check(custom_title is null or length(btrim(custom_title)) between 1 and 200);

create or replace function ders_private.derive_topic_title() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.topic_scope is null and new.custom_title is not distinct from old.custom_title and new.title is distinct from old.title then
  new.custom_title:=null;return new;
 end if;
 if new.custom_title is not null then new.title:=btrim(new.custom_title);
 elsif new.topic_scope='category' then new.title:=btrim(new.topic_category);
 elsif new.topic_scope='topic' then new.title:=btrim(new.topic_name); end if;
 return new;
end $$;
revoke all on function ders_private.derive_topic_title() from public,anon,authenticated;

alter function ders_private.action(text,jsonb) rename to action_before_title_requests;
revoke all on function ders_private.action_before_title_requests(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; q public.teacher_assigned_quests%rowtype;
 a public.teacher_plan_assignments%rowtype; cr public.quest_change_requests%rowtype;
 proposed text; reason text; board jsonb; weeks jsonb;
begin
 if uid is null then raise exception 'Giriş yapmalısın.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 if p_action='request_change' and p_payload->'changes'->>'type'='topic_title' then
  select t.* into q from public.teacher_assigned_quests t join public.teacher_plan_assignments x on x.id=t.assignment_id
   where t.id=(p_payload->>'quest_id')::uuid and x.student_id=uid and x.status='accepted';
  if not found then raise exception 'Bu görev için değişiklik isteyemezsin.' using errcode='42501'; end if;
  proposed:=btrim(p_payload->'changes'->>'title'); reason:=coalesce(btrim(p_payload->'changes'->>'reason'),'');
  if coalesce(length(proposed),0) not between 1 and 200 or length(reason)>2000 or proposed=q.title
  then raise exception 'Farklı bir konu adı (1–200 karakter) ve en fazla 2000 karakter gerekçe gir.'; end if;
  -- Reuse ownership, accepted-link, archive and duplicate-pending checks in the original request pipeline.
  return ders_private.action_before_topics(p_action,jsonb_build_object('quest_id',q.id,'changes',jsonb_build_object(
   'type','topic_title','title',proposed,'current_title',q.title,'reason',reason,'detail',q.detail,'xp',q.xp)));
 elsif p_action='resolve_change' then
  select * into cr from public.quest_change_requests where id=(p_payload->>'id')::uuid for update;
  if cr.requested_changes->>'type'='topic_title' then
   if cr.teacher_id is distinct from uid or cr.status<>'pending' or coalesce(p_payload->>'status','') not in('approved','rejected')
    or not exists(select 1 from public.user_profiles where id=uid and role='teacher')
    or not exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=cr.student_id and status='approved')
   then raise exception 'Bu değişikliği yanıtlayamazsın.' using errcode='42501'; end if;
   perform pg_advisory_xact_lock(hashtextextended(cr.student_id::text,43));
   select * into q from public.teacher_assigned_quests where id=cr.quest_id for update;
   select * into a from public.teacher_plan_assignments where id=q.assignment_id;
   select state into board from public.quest_board_states where user_id=cr.student_id for update;
   if a.student_id is distinct from cr.student_id or a.teacher_id is distinct from uid or a.status is distinct from 'accepted'
    or not exists(select 1 from jsonb_array_elements(board->'weeks') w where w->>'id'=a.week_id and w->>'archived' is distinct from 'true')
   then raise exception 'Program artık değiştirilemez.' using errcode='42501'; end if;
   if p_payload->>'status'='approved' then
    if q.title is distinct from cr.requested_changes->>'current_title' then raise exception 'Konu adı değişmiş. Yeni bir talep oluşturulmalı.'; end if;
    update public.teacher_assigned_quests set custom_title=cr.requested_changes->>'title' where id=q.id returning * into q;
    select jsonb_agg(w.value||jsonb_build_object('quests',coalesce((select jsonb_agg(
     case when x.value->>'id'='teacher-quest-'||q.id then x.value||jsonb_build_object('title',q.title) else x.value end
     order by x.ordinality) from jsonb_array_elements(w.value->'quests') with ordinality x),'[]'::jsonb)) order by w.ordinality)
     into weeks from jsonb_array_elements(board->'weeks') with ordinality w;
    update public.quest_board_states set state=jsonb_set(board,'{weeks}',weeks),updated_at=clock_timestamp(),
     version=greatest(version+1,(extract(epoch from clock_timestamp())*1000)::bigint) where user_id=cr.student_id;
   end if;
   update public.quest_change_requests set status=p_payload->>'status',resolved_at=now() where id=cr.id;
   perform ders_learning_private.notify(cr.student_id,'change:'||cr.id||':'||(p_payload->>'status'),'feedback',uid,cr.student_id,a.week_id,'teacher-quest-'||q.id,a.id);
   return jsonb_build_object('ok',true);
  end if;
 end if;
 result:=ders_private.action_before_title_requests(p_action,p_payload);
 if p_action='overview' then result:=jsonb_set(result,'{capabilities}',coalesce(result->'capabilities','{}')||'{"topicTitleChanges":true}'::jsonb); end if;
 return result;
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
-- Rebind the public wrapper to the new checked entry point; grants and all RLS policies stay unchanged.
create or replace function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_private.action(p_action,p_payload); $$;
commit;
