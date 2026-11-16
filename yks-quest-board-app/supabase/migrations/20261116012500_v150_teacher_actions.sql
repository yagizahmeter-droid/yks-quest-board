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
