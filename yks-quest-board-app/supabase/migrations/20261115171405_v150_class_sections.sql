-- Demand-driven class reads. Existing RPC payloads keep the v1.3 compatibility path.
create function ders_class_private.period(cid uuid,p jsonb) returns table(first_day date,last_day date)
language plpgsql stable security definer set search_path='' as $$
declare mode text:=coalesce(p->>'period','week');today date:=(now() at time zone 'Europe/Istanbul')::date;created date;
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 if not ders_class_private.is_teacher(cid) and mode not in('week','month','all') then raise exception 'Bu dönem yalnızca öğretmene açık.' using errcode='42501';end if;
 select (created_at at time zone 'Europe/Istanbul')::date into created from public.school_classes where id=cid;
 first_day:=case mode when 'all' then created when 'month' then coalesce(date_trunc('month',(p->>'month')::date)::date,date_trunc('month',today)::date) when 'year' then make_date((p->>'year')::integer,1,1) when 'custom' then (p->>'starts_on')::date else coalesce((p->>'week_start')::date,date_trunc('week',today)::date) end;
 last_day:=case mode when 'all' then today when 'month' then (first_day+interval '1 month'-interval '1 day')::date when 'year' then (first_day+interval '1 year'-interval '1 day')::date when 'custom' then (p->>'ends_on')::date else first_day+6 end;
 if mode not in('week','month','year','custom','all') or first_day is null or last_day is null or last_day<first_day or first_day<date '2000-01-01' or last_day>date '2200-01-01' then raise exception 'Geçerli bir tarih aralığı seç.' using errcode='22023';end if;
 first_day:=greatest(first_day,created);last_day:=least(last_day,today);return next;
end $$;

create function ders_class_private.quest_count(sid uuid,aid uuid,q public.teacher_assigned_quests) returns integer
language sql stable security definer set search_path='' as $$
 select case when q.archived_at is not null then 0 when q.repeat_kind<>'none' then
  (select least(q.repeat_target,count(*)::integer) from public.quest_completion_events e where e.quest_id=q.id and e.user_id=sid)
 else case when exists(select 1 from public.teacher_plan_assignments a join public.quest_board_states b on b.user_id=sid,
  jsonb_array_elements(coalesce(b.state->'weeks','[]')) w,jsonb_array_elements(coalesce(w->'quests','[]')) x
  where a.id=aid and w->>'id'=a.week_id and x->>'id'='teacher-quest-'||q.id and x->>'done'='true') then 1 else 0 end end
$$;

create function ders_class_private.homework(cid uuid,first_day date,last_day date) returns jsonb
language sql stable security definer set search_path='' as $$
 with recipients as materialized (
  select cp.id program_id,cp.starts_on,cp.cancelled_at,r.student_id,a.id assignment_id,a.status,a.archived_at
  from public.class_programs cp join public.class_program_recipients r on r.program_id=cp.id join public.teacher_plan_assignments a on a.id=r.assignment_id
  join public.school_classes c on c.id=cid
  where cp.class_id=cid and cp.starts_on<=last_day and cp.ends_on>=first_day
   and (r.student_id=auth.uid() or ders_class_private.is_teacher(cid) and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=r.student_id and sc.status='approved'))
 ), quests as materialized (
  select r.*,q.id quest_id,q.category_name subject,q.repeat_target target,ders_class_private.quest_count(r.student_id,r.assignment_id,q) units
  from recipients r join public.teacher_assigned_quests q on q.assignment_id=r.assignment_id
  where r.status='accepted' and r.cancelled_at is null and r.archived_at is null and q.archived_at is null
 ), per_student as (
  select student_id,count(*) total,count(*) filter(where units>=target) done,sum(units) units,sum(target) targets from quests group by student_id
 ), totals as (
  select count(*) total,count(*) filter(where units>=target) done,count(*) filter(where units>0 and units<target) partial,coalesce(sum(units),0) units,coalesce(sum(target),0) targets from quests
 ), weekly as (
  select date_trunc('week',starts_on)::date starts_on,count(*) total,count(*) filter(where units>=target) done,coalesce(sum(units),0) units,coalesce(sum(target),0) targets from quests group by 1
 ) select to_jsonb(t)||jsonb_build_object('programs',(select count(distinct program_id) from recipients),'started',t.units>0,'percent',round(t.units*100.0/nullif(t.targets,0)),'completionPercent',round(t.done*100.0/nullif(t.total,0)),
  'students',jsonb_build_object('sent',(select count(distinct student_id) from recipients),
   'accepted',(select count(distinct student_id) from recipients where status='accepted' and cancelled_at is null),
   'pending',(select count(distinct student_id) from recipients where status='pending' and cancelled_at is null),
   'rejected',(select count(distinct student_id) from recipients where status='rejected' and cancelled_at is null),
   'withdrawn',(select count(distinct student_id) from recipients where status='withdrawn' and cancelled_at is null),
   'cancelled',(select count(distinct student_id) from recipients where cancelled_at is not null),
   'started',(select count(*) from per_student where units>0),'completed',(select count(*) from per_student where total>0 and total=done)),
  'by_week',(select coalesce(jsonb_agg(w order by w.starts_on desc),'[]') from weekly w),
  'by_student',case when ders_class_private.is_teacher(cid) then (select coalesce(jsonb_agg(s),'[]') from per_student s) else '[]'::jsonb end
 ) from totals t
$$;

create function ders_class_private.program_page(cid uuid,p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare teacher boolean:=ders_class_private.is_teacher(cid);lim integer:=greatest(1,least(50,coalesce((p->>'limit')::integer,20)));off integer:=greatest(0,coalesce((p->>'offset')::integer,0));result jsonb;
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 with programs as materialized (
  select cp.* from public.class_programs cp where cp.class_id=cid and (p->>'program_week' is null or p->>'program_week'='all' or cp.starts_on=(p->>'program_week')::date)
   and (p->>'only_period' is distinct from 'true' or cp.pinned or cp.starts_on<=(p->>'ends_on')::date and cp.ends_on>=(p->>'starts_on')::date)
  order by cp.pinned desc,cp.created_at desc,cp.id limit lim+1 offset off
 ), page as (select * from programs order by pinned desc,created_at desc,id limit lim)
 select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(cp)||jsonb_build_object('recipients',(
  select coalesce(jsonb_agg(jsonb_build_object('student_id',r.student_id,'name',u.display_name,'assignment_id',a.id,'status',a.status,'archived_at',a.archived_at,
   'quests',case when p->>'include_quests' is distinct from 'true' then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('count',case when a.status='accepted' then ders_class_private.quest_count(r.student_id,a.id,q) else 0 end) order by q.sort_order,q.id),'[]') from public.teacher_assigned_quests q where q.assignment_id=a.id) end) order by u.display_name,r.student_id),'[]')
  from public.class_program_recipients r join public.teacher_plan_assignments a on a.id=r.assignment_id join public.user_profiles u on u.id=r.student_id join public.school_classes c on c.id=cid
  where r.program_id=cp.id and (r.student_id=auth.uid() or teacher and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=r.student_id and sc.status='approved'))
  )) order by cp.pinned desc,cp.created_at desc,cp.id),'[]'),'has_more',(select count(*)>lim from programs),'offset',off,'limit',lim) into result from page cp;
 return result;
end $$;

create function ders_class_private.assignment_detail(cid uuid,aid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 select jsonb_build_object('assignment_id',a.id,'status',a.status,'quests',(select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('count',case when a.status='accepted' then ders_class_private.quest_count(a.student_id,a.id,q) else 0 end) order by q.sort_order,q.id),'[]') from public.teacher_assigned_quests q where q.assignment_id=a.id)) into result
  from public.class_program_recipients r join public.teacher_plan_assignments a on a.id=r.assignment_id join public.school_classes c on c.id=cid
  where r.class_id=cid and a.id=aid and (a.student_id=auth.uid() or ders_class_private.is_teacher(cid) and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=a.student_id and sc.status='approved'));
 if result is null then raise exception 'Atamaya erişim yok.' using errcode='42501';end if;return result;
end $$;

create function ders_class_private.peer_profiles(cid uuid,first_day date,last_day date) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',md5(cid::text||m.student_id::text),'name',case when m.share_name then u.display_name else 'Gizli Öğrenci' end,
  'exams',case when m.share_exams then (select coalesce(jsonb_agg(x),'[]') from (select distinct on(e.exam_type,e.groups) e.exam_type,e.name,e.exam_date,e.total_net,e.maximum,e.is_partial,e.groups,e.results from public.practice_exams e where e.user_id=m.student_id and e.exam_date between first_day and last_day and ders_class_private.eligible_exam(cid,e.user_id,e.exam_date,e.created_at) order by e.exam_type,e.groups,e.exam_date desc,e.created_at desc) x) else null end,
  'study_ms',case when m.share_study then (select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=m.student_id and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,s.user_id,s.started_at,s.ended_at)) else null end)),'[]')
 from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and m.student_id<>auth.uid() and ders_class_private.can_read(cid) and ders_class_private.is_member(cid,m.student_id) and (m.share_exams or m.share_study)
$$;

create index v150_contribution_page on public.class_contributions(task_id,created_at desc,id);
create index v150_program_page on public.class_programs(class_id,pinned desc,created_at desc,id);
create function ders_class_private.contribution_page(cid uuid,tid uuid,off integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not ders_class_private.can_read(cid) or not exists(select 1 from public.class_shared_tasks where id=tid and class_id=cid) then raise exception 'Bu göreve erişim yok.' using errcode='42501';end if;
 if off<0 or off>100000 then raise exception 'Geçerli sayfa seç.' using errcode='22023';end if;
 with candidates as materialized (
  select con.*,u.display_name name from public.class_contributions con join public.user_profiles u on u.id=con.student_id join public.school_classes c on c.id=cid
  where con.task_id=tid and (con.student_id=auth.uid() or ders_class_private.is_teacher(cid) and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=con.student_id and sc.status='approved')) order by con.created_at desc,con.id limit 21 offset off
 ), page as (select * from candidates order by created_at desc,id limit 20)
 select jsonb_build_object('items',coalesce(jsonb_agg(p order by p.created_at desc,p.id),'[]'),'has_more',(select count(*)>20 from candidates),'offset',off,'limit',20) into result from page p;return result;
end $$;

create function ders_class_private.view(cid uuid,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare teacher boolean:=ders_class_private.is_teacher(cid);c public.school_classes%rowtype;section text:=coalesce(p->>'section','summary');
 first_day date;last_day date;stats jsonb;hw jsonb;programs jsonb;result jsonb;lim integer:=greatest(1,least(50,coalesce((p->>'limit')::integer,20)));off integer:=greatest(0,coalesce((p->>'offset')::integer,0));
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 if section not in('summary','members','programs','shared','ranking','statistics','announcements','settings') then raise exception 'Geçerli bir sınıf bölümü seç.' using errcode='22023';end if;
 select * into c from public.school_classes where id=cid;select r.first_day,r.last_day into first_day,last_day from ders_class_private.period(cid,p) r;
 stats:=jsonb_build_object('starts_on',first_day,'ends_on',last_day,'active_members',(select count(*) from public.class_memberships m where m.class_id=cid and ders_class_private.is_member(cid,m.student_id)),'study',null,'exams','[]'::jsonb,'exam_trend','[]'::jsonb,'partial_exams',null);
 if section in('summary','statistics') then stats:=ders_class_private.stats(cid,first_day,last_day);end if;
 if section in('summary','statistics','members') then hw:=ders_class_private.homework(cid,first_day,last_day);end if;
 if section in('summary','programs') then programs:=ders_class_private.program_page(cid,p||case when section='summary' then jsonb_build_object('limit',4,'offset',0,'include_quests',false,'only_period',true,'starts_on',first_day,'ends_on',last_day) else '{}'::jsonb end);end if;
 result:=jsonb_build_object('view_version',2,'section',section,'class',to_jsonb(c)||jsonb_build_object('teacher_name',(select display_name from public.user_profiles where id=c.teacher_id)),
  'teacher',teacher,'statistics',stats,'homework',hw,'shared_profiles','[]'::jsonb,'programs',coalesce(programs->'items','[]'),'pagination',jsonb_build_object('programs',programs-'items','offset',off,'limit',lim),
  'preferences',(select jsonb_build_object('share_name',share_name,'share_study',share_study,'share_exams',share_exams) from public.class_memberships where class_id=cid and student_id=auth.uid()),
  'members',case when section='members' then (select coalesce(jsonb_agg(jsonb_build_object('key',md5(cid::text||m.student_id::text),'student_id',case when teacher or m.student_id=auth.uid() then m.student_id else null end,
   'name',case when teacher or m.student_id=auth.uid() or m.share_name then u.display_name else 'Gizli Öğrenci' end,'status',m.status,'joined_at',m.joined_at,'left_at',m.left_at,
   'connected',ders_class_private.is_member(cid,m.student_id),'linked',exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=m.student_id and sc.status='approved'),
   'study_ms',case when teacher or m.student_id=auth.uid() then (select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=m.student_id and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,s.user_id,s.started_at,s.ended_at)) else null end) order by u.display_name,m.student_id),'[]')
   from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and (teacher or ders_class_private.is_member(cid,m.student_id))) else '[]'::jsonb end,
  'requests',case when section in('summary','members') then (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('name',r.display_name) order by r.created_at desc),'[]') from (select rq.*,u.display_name from public.class_requests rq join public.user_profiles u on u.id=rq.student_id where rq.class_id=cid and (teacher or rq.student_id=auth.uid()) and (rq.status='pending' or section='members') order by rq.created_at desc,rq.id limit case when section='summary' then 200 else lim end offset case when section='summary' then 0 else off end) r) else '[]'::jsonb end,
  'link',case when teacher and section='settings' then (select token from ders_class_private.invite_links where class_id=cid) else null end,
  'shared_tasks','[]'::jsonb,'leaderboard','[]'::jsonb,'xp_history','[]'::jsonb,'announcements','[]'::jsonb,'events','[]'::jsonb);
 if section='programs' then result:=result||jsonb_build_object('program_weeks',(select coalesce(jsonb_agg(d.starts_on order by d.starts_on desc),'[]') from (select distinct starts_on from public.class_programs where class_id=cid) d));end if;
 if section in('summary','ranking') then
  result:=jsonb_set(result,'{leaderboard}',(select coalesce(jsonb_agg(x order by x.rank,x.key),'[]') from (
   select rank() over(order by coalesce(sum(l.amount),0) desc) rank,md5(cid::text||m.student_id::text) key,m.student_id=auth.uid() own,
    case when teacher or m.student_id=auth.uid() or m.share_name then u.display_name else 'Gizli Öğrenci' end name,coalesce(sum(l.amount),0) xp,
    (select coalesce(sum(z.amount),0) from public.class_xp_ledger z where z.class_id=cid and z.student_id=m.student_id) total_xp
   from public.class_memberships m join public.user_profiles u on u.id=m.student_id left join public.class_xp_ledger l on l.class_id=cid and l.student_id=m.student_id and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day
   where m.class_id=cid and ders_class_private.is_member(cid,m.student_id) group by m.student_id,m.share_name,u.display_name) x));
 end if;
 if section='ranking' then result:=jsonb_set(result,'{xp_history}',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select l.* from public.class_xp_ledger l where l.class_id=cid and (l.student_id=auth.uid() or teacher and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=l.student_id and sc.status='approved')) and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day order by l.created_at desc,l.id limit lim offset off) x));end if;
 if section in('summary','shared') then
  result:=jsonb_set(result,'{shared_tasks}',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('display_status',case when t.status<>'open' then t.status when (now() at time zone 'Europe/Istanbul')::date>t.ends_on then 'expired' when (now() at time zone 'Europe/Istanbul')::date<t.starts_on then 'not_started' else 'in_progress' end,
   'total',(select coalesce(sum(amount),0) from public.class_contributions where task_id=t.id),'own_total',(select coalesce(sum(amount),0) from public.class_contributions where task_id=t.id and student_id=auth.uid()),'own_xp',(select coalesce(sum(amount),0) from public.class_xp_ledger where task_id=t.id and student_id=auth.uid()),
   'contributions',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select con.*,u.display_name name from public.class_contributions con join public.user_profiles u on u.id=con.student_id where con.task_id=t.id and section='shared' and (con.student_id=auth.uid() or teacher and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=con.student_id and sc.status='approved')) order by con.created_at desc,con.id limit 20) x)) order by t.created_at desc),'[]')
   from (select * from public.class_shared_tasks where class_id=cid order by created_at desc,id limit case when section='summary' then 3 else lim end offset case when section='summary' then 0 else off end) t));
 end if;
 if section in('summary','announcements') then result:=jsonb_set(result,'{announcements}',(select coalesce(jsonb_agg(x order by x.pinned desc,x.created_at desc),'[]') from (select a.* from public.class_announcements a where a.class_id=cid and a.deleted_at is null order by a.pinned desc,a.created_at desc,a.id limit case when section='summary' then 3 else lim end offset case when section='summary' then 0 else off end) x));end if;
 if section='settings' and teacher then result:=jsonb_set(result,'{events}',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select * from public.class_events where class_id=cid order by created_at desc,id limit lim offset off) x));end if;
 result:=jsonb_set(result,'{pagination,has_more}',to_jsonb(case section
  when 'programs' then coalesce((programs->>'has_more')::boolean,false)
  when 'members' then exists(select 1 from public.class_requests where class_id=cid and (teacher or student_id=auth.uid()) order by created_at desc,id offset off+lim limit 1)
  when 'shared' then exists(select 1 from public.class_shared_tasks where class_id=cid order by created_at desc,id offset off+lim limit 1)
  when 'announcements' then exists(select 1 from public.class_announcements where class_id=cid and deleted_at is null order by pinned desc,created_at desc,id offset off+lim limit 1)
  when 'settings' then teacher and exists(select 1 from public.class_events where class_id=cid order by created_at desc,id offset off+lim limit 1)
  when 'ranking' then exists(select 1 from public.class_xp_ledger l where l.class_id=cid and (l.student_id=auth.uid() or teacher and exists(select 1 from public.student_teacher_connections sc where sc.teacher_id=c.teacher_id and sc.student_id=l.student_id and sc.status='approved')) and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day order by l.created_at desc,l.id offset off+lim limit 1)
  else false end));
 if section='statistics' and not teacher then
  -- Individual, opt-in peer profiles retain the same scope and privacy as M1.
  result:=jsonb_set(result,'{shared_profiles}',ders_class_private.peer_profiles(cid,first_day,last_day));
 end if;
 return result;
end $$;
-- Lock-free authenticated reads; mutations retain the existing class transaction lock.
alter function ders_class_private.action(text,jsonb) rename to action_m1;
create function ders_class_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if p_action='overview' then return ders_class_private.action_m1(p_action,p)||jsonb_build_object('api_version',2);end if;
 if p_action='detail' and p->>'view_version'='2' then return ders_class_private.view((p->>'class_id')::uuid,p);end if;
 if p_action='assignment_detail' then return ders_class_private.assignment_detail((p->>'class_id')::uuid,(p->>'assignment_id')::uuid);end if;
 if p_action='contribution_page' then return ders_class_private.contribution_page((p->>'class_id')::uuid,(p->>'task_id')::uuid,coalesce((p->>'offset')::integer,0));end if;
 return ders_class_private.action_m1(p_action,p);
end $$;
revoke all on function ders_class_private.period(uuid,jsonb),ders_class_private.quest_count(uuid,uuid,public.teacher_assigned_quests),ders_class_private.homework(uuid,date,date),ders_class_private.program_page(uuid,jsonb),ders_class_private.view(uuid,jsonb),ders_class_private.assignment_detail(uuid,uuid),ders_class_private.peer_profiles(uuid,date,date),ders_class_private.contribution_page(uuid,uuid,integer),ders_class_private.action_m1(text,jsonb) from public,anon,authenticated;
revoke all on function ders_class_private.action(text,jsonb) from public,anon;
grant execute on function ders_class_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';
