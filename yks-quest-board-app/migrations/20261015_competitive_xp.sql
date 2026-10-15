begin;

create temporary table ders_xp_board_check on commit drop as
select user_id,state,version from public.quest_board_states;

-- Refuse ambiguous legacy provenance instead of silently rewriting somebody's tasks.
do $$ begin
 if exists(select 1 from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w,
   jsonb_array_elements(w->'quests') x where
   (x->>'source'='teacher_assigned' or x->>'lockedForStudent'='true' or
    x->>'assignedQuestId' is not null or x->>'assignedByTeacherId' is not null or x->>'id' like 'teacher-quest-%')
   and not exists(select 1 from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id
     where a.student_id=b.user_id and a.status='accepted' and a.week_id=w->>'id' and x->>'id'='teacher-quest-'||q.id))
 then raise exception 'Mevcut görevlerde doğrulanamayan öğretmen kaynağı var. Veri değiştirilmedi; inceleme gerekli.'; end if;
end $$;

insert into ders_private.teacher_update_backups(snapshot) select jsonb_build_object(
 'upgrade','competitive_xp','boards',(select coalesce(jsonb_agg(to_jsonb(b)),'[]') from public.quest_board_states b),
 'action_definition',pg_get_functiondef('ders_private.action(text,jsonb)'::regprocedure));

create function ders_private.xp_breakdown(p_user uuid,p_board jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with assigned as (
   select q.*,a.week_id from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id
   where a.student_id=p_user and a.status='accepted'
 ), competitive as (
   select coalesce(sum(q.xp) filter(where q.repeat_kind='none' and exists(
     select 1 from jsonb_array_elements(coalesce(p_board->'weeks','[]')) w,jsonb_array_elements(w->'quests') x
     where w->>'id'=q.week_id and x->>'id'='teacher-quest-'||q.id and x->>'done'='true')),0)
   +(select coalesce(sum(e.xp),0) from public.quest_completion_events e join assigned q on q.id=e.quest_id where e.user_id=p_user) as xp
   from assigned q
 ), personal as (
   select coalesce(sum(case when jsonb_typeof(x->'xp')='number' then greatest(0,(x->>'xp')::numeric) else 0 end),0) as xp
   from jsonb_array_elements(coalesce(p_board->'weeks','[]')) w,jsonb_array_elements(w->'quests') x
   where x->>'done'='true' and not exists(select 1 from assigned q where x->>'id'='teacher-quest-'||q.id)
 ) select jsonb_build_object('competitive',competitive.xp,'personal',personal.xp,'total',competitive.xp+personal.xp)
 from competitive,personal
$$;
revoke all on function ders_private.xp_breakdown(uuid,jsonb) from public,anon,authenticated;

create function ders_private.protect_teacher_provenance() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(new.state->'weeks') w,jsonb_array_elements(w->'quests') x
   where (x->>'source'='teacher_assigned' or x->>'lockedForStudent'='true' or x->>'assignedQuestId' is not null
     or x->>'assignedByTeacherId' is not null or x->>'id' like 'teacher-quest-%')
   and not exists(select 1 from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id
     where a.student_id=new.user_id and a.status='accepted' and a.week_id=w->>'id' and x->>'id'='teacher-quest-'||q.id))
 then raise exception 'Kişisel görev öğretmen görevi olarak gösterilemez.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function ders_private.protect_teacher_provenance() from public,anon,authenticated;
create trigger protect_teacher_provenance before insert or update on public.quest_board_states
for each row execute function ders_private.protect_teacher_provenance();

alter function ders_private.action(text,jsonb) rename to action_repeat_base;
revoke all on function ders_private.action_repeat_base(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); b public.quest_board_states%rowtype; result jsonb;
begin
 if uid is null then raise exception 'Giriş yapmalısın.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 if p_action='read_board' then
   select * into b from public.quest_board_states where user_id=uid;
   return jsonb_build_object('state',b.state,'version',b.version,'updated_at',b.updated_at,
     'xpBreakdown',ders_private.xp_breakdown(uid,b.state));
 end if;
 result:=ders_private.action_repeat_base(p_action,p_payload);
 if p_action='student_board' then
   -- The existing RPC has already checked the live teacher/student connection.
   result:=result||jsonb_build_object('xpBreakdown',ders_private.xp_breakdown((p_payload->>'student_id')::uuid,result->'state'));
 elsif p_action in ('overview','sync_board') then
   result:=result||jsonb_build_object('xpBreakdown',ders_private.xp_breakdown(uid,(select state from public.quest_board_states where user_id=uid)));
 end if;
 return result;
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
create or replace function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_private.action(p_action,p_payload); $$;
revoke all on function public.ders_action(text,jsonb) from public,anon;
grant execute on function public.ders_action(text,jsonb) to authenticated;

do $$ begin
 if exists(select 1 from ders_xp_board_check b full join public.quest_board_states s using(user_id)
   where b.user_id is null or s.user_id is null or b.state is distinct from s.state or b.version is distinct from s.version)
 then raise exception 'XP migration mevcut veriyi değiştirdi; işlem geri alındı.'; end if;
end $$;
notify pgrst,'reload schema';
commit;
