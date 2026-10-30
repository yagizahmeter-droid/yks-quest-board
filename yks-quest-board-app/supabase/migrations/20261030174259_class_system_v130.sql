begin;
-- Additive class data only. Existing boards, accounts and policies are not rewritten.
create schema ders_class_private;
revoke all on schema ders_class_private from public,anon,authenticated;
grant usage on schema ders_class_private to authenticated;
create table public.school_classes (
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),
 name text not null check(length(btrim(name)) between 1 and 120),description text not null default '' check(length(description)<=2000),
 created_at timestamptz not null default now(),archived_at timestamptz
);
create index classes_teacher on public.school_classes(teacher_id,created_at desc);
create table public.class_memberships (
 class_id uuid not null references public.school_classes(id),student_id uuid not null references public.user_profiles(id),
 status text not null check(status in('active','left','removed')),joined_at timestamptz not null default now(),left_at timestamptz,
 share_name boolean not null default false,share_exams boolean not null default false,share_study boolean not null default false,
 primary key(class_id,student_id)
);
create index class_members_student on public.class_memberships(student_id,status,class_id);
create table public.class_requests (
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.school_classes(id),
 student_id uuid not null references public.user_profiles(id),kind text not null check(kind in('invite','join')),
 status text not null default 'pending' check(status in('pending','accepted','rejected','cancelled')),
 created_at timestamptz not null default now(),resolved_at timestamptz
);
create unique index one_class_pending_request on public.class_requests(class_id,student_id) where status='pending';
create index class_requests_student on public.class_requests(student_id,created_at desc);
create table ders_class_private.invite_links (
 class_id uuid primary key references public.school_classes(id),token text not null unique,created_at timestamptz not null default now()
);
alter table ders_class_private.invite_links enable row level security;
revoke all on ders_class_private.invite_links from public,anon,authenticated;
create table public.class_programs (
 id uuid primary key,class_id uuid not null references public.school_classes(id),name text not null,
 starts_on date not null,ends_on date not null,created_at timestamptz not null default now(),pinned boolean not null default false,cancelled_at timestamptz,
 check(ends_on>=starts_on)
);
create index class_programs_period on public.class_programs(class_id,starts_on desc);
create table public.class_program_recipients (
 program_id uuid not null references public.class_programs(id),class_id uuid not null references public.school_classes(id),
 student_id uuid not null references public.user_profiles(id),assignment_id uuid not null unique references public.teacher_plan_assignments(id),
 primary key(program_id,student_id)
);
create index class_recipient_student on public.class_program_recipients(student_id,class_id);
create table public.class_shared_tasks (
 id uuid primary key,class_id uuid not null references public.school_classes(id),name text not null check(length(btrim(name)) between 1 and 200),
 subject text not null check(length(btrim(subject)) between 1 and 100),description text not null default '' check(length(description)<=2000),
 kind text not null check(kind in('duration','questions')),target bigint not null check(target between 1 and 100000000000),
 starts_on date not null,ends_on date not null,xp_pool integer not null check(xp_pool between 1 and 1000000),
 status text not null default 'open' check(status in('open','completed','cancelled')),
 completed_at timestamptz,settled_at timestamptz,created_at timestamptz not null default now(),check(ends_on>=starts_on)
);
create index class_shared_period on public.class_shared_tasks(class_id,starts_on desc);
create table public.class_contributions (
 id uuid primary key,task_id uuid not null references public.class_shared_tasks(id),class_id uuid not null references public.school_classes(id),
 student_id uuid not null references public.user_profiles(id),amount bigint not null check(amount between 0 and 100000000000),
 segment_id text,contribution_date date not null,note text not null default '' check(length(note)<=2000),
 created_at timestamptz not null default now(),corrected_at timestamptz,
 foreign key(student_id,segment_id) references public.study_segments(user_id,id)
);
-- A verified focus segment is consumable once across ALL shared tasks/classes, including corrections.
create unique index class_segment_once on public.class_contributions(student_id,segment_id) where segment_id is not null;
create index class_contributions_task on public.class_contributions(task_id,student_id);
create index class_contributions_owner on public.class_contributions(student_id,class_id);
create table public.class_xp_ledger (
 id bigint generated always as identity primary key,class_id uuid not null references public.school_classes(id),
 student_id uuid not null references public.user_profiles(id),amount integer not null check(amount between -1000000 and 1000000),
 source text not null,task_id uuid references public.class_shared_tasks(id),created_at timestamptz not null default now(),
 unique(class_id,student_id,source)
);
create index class_xp_period on public.class_xp_ledger(class_id,created_at,student_id);
create table public.class_announcements (
 id uuid primary key,class_id uuid not null references public.school_classes(id),title text not null check(length(btrim(title)) between 1 and 200),
 body text not null check(length(btrim(body)) between 1 and 4000),pinned boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz
);
create index class_announcements_class on public.class_announcements(class_id,created_at desc);
create table public.class_events (
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.school_classes(id),
 actor_id uuid not null references public.user_profiles(id),action text not null,context jsonb not null default '{}',created_at timestamptz not null default now()
);
create index class_events_class on public.class_events(class_id,created_at desc);
create function ders_class_private.is_teacher(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.school_classes c join public.user_profiles p on p.id=c.teacher_id where c.id=cid and c.teacher_id=auth.uid() and p.role='teacher')
$$;
create function ders_class_private.is_member(cid uuid,sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.class_memberships m join public.school_classes c on c.id=m.class_id
 join public.student_teacher_connections conn on conn.student_id=m.student_id and conn.teacher_id=c.teacher_id and conn.status='approved'
 where m.class_id=cid and m.student_id=sid and m.status='active')
$$;
create function ders_class_private.can_read(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ders_class_private.is_teacher(cid) or ders_class_private.is_member(cid,auth.uid()))
$$;
revoke all on function ders_class_private.is_member(uuid,uuid) from public,anon,authenticated;
revoke all on function ders_class_private.is_teacher(uuid),ders_class_private.can_read(uuid) from public,anon;
grant execute on function ders_class_private.is_teacher(uuid),ders_class_private.can_read(uuid) to authenticated;
do $$ declare t text;begin
 foreach t in array array['school_classes','class_memberships','class_requests','class_programs','class_program_recipients','class_shared_tasks','class_contributions','class_xp_ledger','class_announcements','class_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy class_read on public.school_classes for select to authenticated using(ders_class_private.can_read(id));
create policy class_member_read on public.class_memberships for select to authenticated using(student_id=(select auth.uid()) or ders_class_private.is_teacher(class_id));
create policy class_request_read on public.class_requests for select to authenticated using(student_id=(select auth.uid()) or ders_class_private.is_teacher(class_id));
create policy class_program_read on public.class_programs for select to authenticated using(ders_class_private.can_read(class_id));
create policy class_recipient_read on public.class_program_recipients for select to authenticated using(ders_class_private.can_read(class_id) and (student_id=(select auth.uid()) or ders_class_private.is_teacher(class_id)));
create policy class_shared_read on public.class_shared_tasks for select to authenticated using(ders_class_private.can_read(class_id));
create policy class_contribution_read on public.class_contributions for select to authenticated using(ders_class_private.can_read(class_id) and (student_id=(select auth.uid()) or ders_class_private.is_teacher(class_id)));
create policy class_xp_read on public.class_xp_ledger for select to authenticated using(ders_class_private.can_read(class_id) and (student_id=(select auth.uid()) or ders_class_private.is_teacher(class_id)));
create policy class_announcement_read on public.class_announcements for select to authenticated using(ders_class_private.can_read(class_id) and deleted_at is null);
create policy class_event_read on public.class_events for select to authenticated using(ders_class_private.is_teacher(class_id));

create function ders_class_private.notice(cid uuid,recipient uuid,event text,label text,actor uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Keep the existing notification preferences, ownership policy and read/unread machinery.
 perform ders_learning_private.notify(recipient,'class:'||cid||':'||event,'feedback',actor,recipient,cid::text,label);
end $$;
revoke all on function ders_class_private.notice(uuid,uuid,text,text,uuid) from public,anon,authenticated;
create function ders_class_private.settle(tid uuid,correction uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare t public.class_shared_tasks%rowtype;total numeric;budget integer;reward record;current_xp integer;
begin
 select * into t from public.class_shared_tasks where id=tid for update;
 select coalesce(sum(amount),0) into total from public.class_contributions where task_id=tid;
 if correction is null then
  if t.settled_at is not null or t.status<>'open' or total<t.target or (now() at time zone 'Europe/Istanbul')::date>t.ends_on then return;end if;
  update public.class_shared_tasks set status='completed',completed_at=now(),settled_at=now() where id=tid;
 elsif t.settled_at is null then return;
 elsif total<t.target then update public.class_shared_tasks set status='cancelled' where id=tid;
 end if;
 budget:=case when total>=t.target and t.status<>'cancelled' then t.xp_pool else 0 end;
 -- Largest remainder allocation: exact integer pool; UUID order deterministically breaks ties.
 for reward in with amounts as (
  select student_id,sum(amount) amount from public.class_contributions where task_id=tid group by student_id
 ), shares as (
  select student_id,floor(case when total>0 then amount*budget/total else 0 end)::integer base,
   case when total>0 then amount*budget/total-floor(amount*budget/total) else 0 end fraction from amounts
 ), ranked as (
  select *,row_number() over(order by fraction desc,student_id) n,budget-sum(base) over() extra from shares
 ) select student_id,base+case when n<=extra then 1 else 0 end xp from ranked loop
  select coalesce(sum(amount),0) into current_xp from public.class_xp_ledger where task_id=tid and student_id=reward.student_id;
  insert into public.class_xp_ledger(class_id,student_id,amount,source,task_id)
   values(t.class_id,reward.student_id,reward.xp-current_xp,case when correction is null then 'shared:'||tid else 'correction:'||correction end,tid)
   on conflict do nothing;
  if correction is null then perform ders_class_private.notice(t.class_id,reward.student_id,'shared:'||tid,'Ortak Görev Tamamlandı',auth.uid());end if;
 end loop;
end $$;
revoke all on function ders_class_private.settle(uuid,uuid) from public,anon,authenticated;
create function ders_class_private.reward_completion() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if tg_table_name='quest_completion_events' then
  insert into public.class_xp_ledger(class_id,student_id,amount,source)
   select p.class_id,new.user_id,new.xp,'repeat:'||new.id from public.class_program_recipients p
   join public.teacher_assigned_quests q on q.assignment_id=p.assignment_id join public.class_programs cp on cp.id=p.program_id
   join public.school_classes c on c.id=p.class_id where q.id=new.quest_id and p.student_id=new.user_id
   and ders_class_private.is_member(p.class_id,new.user_id) and c.archived_at is null and cp.cancelled_at is null on conflict do nothing;
 else
  for r in select p.class_id,q.id,q.xp,a.week_id from public.class_program_recipients p
   join public.teacher_plan_assignments a on a.id=p.assignment_id join public.teacher_assigned_quests q on q.assignment_id=a.id
   join public.class_programs cp on cp.id=p.program_id join public.school_classes c on c.id=p.class_id
   where p.student_id=new.user_id and a.status='accepted' and q.repeat_kind='none' and q.archived_at is null and a.archived_at is null
    and cp.cancelled_at is null and c.archived_at is null and ders_class_private.is_member(p.class_id,new.user_id) loop
   if exists(select 1 from jsonb_array_elements(new.state->'weeks') w,jsonb_array_elements(w->'quests') x where w->>'id'=r.week_id and x->>'id'='teacher-quest-'||r.id and x->>'done'='true')
    and (tg_op='INSERT' or not exists(select 1 from jsonb_array_elements(old.state->'weeks') w,jsonb_array_elements(w->'quests') x where w->>'id'=r.week_id and x->>'id'='teacher-quest-'||r.id and x->>'done'='true')) then
    insert into public.class_xp_ledger(class_id,student_id,amount,source) values(r.class_id,new.user_id,r.xp,'quest:'||r.id) on conflict do nothing;
   end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function ders_class_private.reward_completion() from public,anon,authenticated;
create trigger class_repeat_reward after insert on public.quest_completion_events for each row execute function ders_class_private.reward_completion();
create trigger class_normal_reward after insert or update on public.quest_board_states for each row execute function ders_class_private.reward_completion();

create function ders_class_private.stats(cid uuid,first_day date,last_day date) returns jsonb language sql stable security definer set search_path='' as $$
 with members as (
  select m.student_id from public.class_memberships m where m.class_id=cid and ders_class_private.is_member(cid,m.student_id)
 ), time_rows as (
  select s.* from public.study_segments s join members m on m.student_id=s.user_id
  where (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day
 ), eligible_exams as (
  select e.*,(select string_agg(g->>'id',',' order by g->>'id') from jsonb_array_elements(e.groups) g) scope
  from public.practice_exams e join members m on m.student_id=e.user_id
  where e.exam_date between first_day and last_day and not e.is_partial and e.total_net is not null
 ), latest as (
  select distinct on(user_id,exam_type,scope) * from eligible_exams order by user_id,exam_type,scope,exam_date desc,created_at desc,id
 ), averages as (
  select exam_type,scope,maximum,count(*) participants,round(avg(total_net),2) average from latest group by exam_type,scope,maximum
 ), parts as (
  select exam_type,scope,k.key part,round(avg((k.value->>'correct')::numeric-(k.value->>'wrong')::numeric/4),2) net,count(*) participants
  from latest,jsonb_each(results) k where k.value->>'correct' is not null and k.value->>'wrong' is not null group by exam_type,scope,k.key
 ), daily_last as (
  select distinct on(user_id,exam_type,scope,exam_date) * from eligible_exams order by user_id,exam_type,scope,exam_date,created_at desc,id
 ), trend as (
  select exam_type,scope,exam_date as day,round(avg(total_net),2) average,count(*) participants from daily_last group by exam_type,scope,exam_date
 ) select jsonb_build_object(
  'active_members',(select count(*) from members),'starts_on',first_day,'ends_on',last_day,
  'study',jsonb_build_object('total_ms',(select coalesce(sum(duration_ms),0) from time_rows),
   'per_member_ms',(select case when count(*)>0 then (select coalesce(sum(duration_ms),0) from time_rows)/count(*) else 0 end from members),
   'daily_average_ms',(select case when count(*)>0 then (select coalesce(sum(duration_ms),0) from time_rows)/count(*)/greatest(1,last_day-first_day+1) else 0 end from members),
   'by_day',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select (started_at at time zone 'Europe/Istanbul')::date as day,sum(duration_ms) duration_ms from time_rows group by 1) x),
   'by_subject',(select coalesce(jsonb_agg(x),'[]') from (select category_name subject,sum(duration_ms) duration_ms from time_rows group by 1) x)),
  'exams',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('subjects',(select coalesce(jsonb_agg(p),'[]') from parts p where p.exam_type=a.exam_type and p.scope=a.scope))),'[]') from averages a),
  'exam_trend',(select coalesce(jsonb_agg(t order by t.day),'[]') from trend t),
  'partial_exams',(select count(*) from public.practice_exams e join members m on m.student_id=e.user_id where e.exam_date between first_day and last_day and e.is_partial),
  'average_method','Öğrenci başına seçili dönemdeki en son tam deneme; sınav ve test kapsamları ayrı.',
  'trend_method','Her gün öğrenci başına son tam deneme; yalnızca o gün sonuç girenler.',
  'study_method','Hiç çalışmamış aktif üyeler sıfır süreyle ortalamaya dahildir.'
 )
$$;
revoke all on function ders_class_private.stats(uuid,date,date) from public,anon,authenticated;

create function ders_class_private.detail(cid uuid,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();teacher boolean:=ders_class_private.is_teacher(cid);c public.school_classes%rowtype;first_day date;last_day date;statistics jsonb;peers jsonb;
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 select * into c from public.school_classes where id=cid;
 first_day:=case p->>'period' when 'month' then date_trunc('month',now() at time zone 'Europe/Istanbul')::date when 'all' then date '1900-01-01' else coalesce((p->>'week_start')::date,date_trunc('week',now() at time zone 'Europe/Istanbul')::date) end;
 last_day:=case p->>'period' when 'month' then (first_day+interval '1 month'-interval '1 day')::date when 'all' then (now() at time zone 'Europe/Istanbul')::date else first_day+6 end;
 statistics:=ders_class_private.stats(cid,first_day,last_day);
 -- Students never receive a small-group aggregate from which a private result can be inferred.
 if not teacher then
  statistics:=jsonb_set(statistics,'{exams}',coalesce((select jsonb_agg(x-'subjects') from jsonb_array_elements(statistics->'exams') x where (x->>'participants')::integer>=3),'[]'));
  statistics:=jsonb_set(statistics,'{exam_trend}',coalesce((select jsonb_agg(x) from jsonb_array_elements(statistics->'exam_trend') x where (x->>'participants')::integer>=3),'[]'));
  if (statistics->>'active_members')::integer<3 then statistics:=jsonb_set(statistics,'{study}','null');end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',md5(cid::text||m.student_id::text),'name',case when m.share_name then u.display_name else 'Gizli Öğrenci' end,
  'exams',case when m.share_exams then (select coalesce(jsonb_agg(x),'[]') from (select distinct on(e.exam_type,e.groups) e.exam_type,e.name,e.exam_date,e.total_net,e.maximum,e.is_partial,e.groups,e.results from public.practice_exams e where e.user_id=m.student_id and e.exam_date between first_day and last_day order by e.exam_type,e.groups,e.exam_date desc,e.created_at desc) x) else 'null'::jsonb end,
  'study_ms',case when m.share_study then (select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=m.student_id and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day) else null end)),'[]') into peers
  from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and ders_class_private.is_member(cid,m.student_id) and m.student_id<>uid and (m.share_exams or m.share_study);
 return jsonb_build_object('class',to_jsonb(c)||jsonb_build_object('teacher_name',(select display_name from public.user_profiles where id=c.teacher_id)),
  'teacher',teacher,'statistics',statistics,'shared_profiles',case when teacher then '[]'::jsonb else peers end,
  'members',(select coalesce(jsonb_agg(jsonb_build_object('key',md5(cid::text||m.student_id::text),'student_id',case when teacher or m.student_id=uid then m.student_id else null end,
    'name',case when teacher or m.student_id=uid or m.share_name then u.display_name else 'Gizli Öğrenci' end,'status',m.status,'joined_at',m.joined_at,'left_at',m.left_at,
    'connected',ders_class_private.is_member(cid,m.student_id),
    'study_ms',case when teacher or m.student_id=uid then (select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=m.student_id and ders_class_private.is_member(cid,m.student_id) and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day) else null end)),'[]')
   from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and (teacher or ders_class_private.is_member(cid,m.student_id))),
  'requests',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('name',u.display_name) order by r.created_at desc),'[]') from public.class_requests r join public.user_profiles u on u.id=r.student_id where r.class_id=cid and (teacher or r.student_id=uid)),
  'link',case when teacher then (select token from ders_class_private.invite_links where class_id=cid) else null end,
  'preferences',(select jsonb_build_object('share_name',share_name,'share_exams',share_exams,'share_study',share_study) from public.class_memberships where class_id=cid and student_id=uid),
  'programs',(select coalesce(jsonb_agg(to_jsonb(cp)||jsonb_build_object('recipients',(
   select coalesce(jsonb_agg(jsonb_build_object('student_id',r.student_id,'name',u.display_name,'assignment_id',a.id,'status',a.status,
    'quests',(select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('count',case when q.repeat_kind='none' then case when exists(select 1 from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w,jsonb_array_elements(w->'quests') x where b.user_id=r.student_id and w->>'id'=a.week_id and x->>'id'='teacher-quest-'||q.id and x->>'done'='true') then 1 else 0 end else (select count(*) from public.quest_completion_events e where e.quest_id=q.id and e.user_id=r.student_id) end) order by q.sort_order),'[]') from public.teacher_assigned_quests q where q.assignment_id=a.id))),'[]')
   from public.class_program_recipients r join public.teacher_plan_assignments a on a.id=r.assignment_id join public.user_profiles u on u.id=r.student_id
   where r.program_id=cp.id and (teacher and ders_class_private.is_member(cid,r.student_id) or r.student_id=uid))) order by cp.pinned desc,cp.created_at desc),'[]') from public.class_programs cp where cp.class_id=cid),
  'shared_tasks',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('display_status',case when t.status<>'open' then t.status when (now() at time zone 'Europe/Istanbul')::date>t.ends_on then 'expired' when (now() at time zone 'Europe/Istanbul')::date<t.starts_on then 'not_started' else 'in_progress' end,
   'total',(select coalesce(sum(amount),0) from public.class_contributions where task_id=t.id),'own_total',(select coalesce(sum(amount),0) from public.class_contributions where task_id=t.id and student_id=uid),
   'own_xp',(select coalesce(sum(amount),0) from public.class_xp_ledger where task_id=t.id and student_id=uid),
   'contributions',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('name',u.display_name) order by x.created_at desc),'[]') from public.class_contributions x join public.user_profiles u on u.id=x.student_id where x.task_id=t.id and (teacher or x.student_id=uid))) order by t.created_at desc),'[]') from public.class_shared_tasks t where t.class_id=cid),
  'leaderboard',(select coalesce(jsonb_agg(x order by x.rank,x.key),'[]') from (
   select rank() over(order by coalesce(sum(l.amount),0) desc) rank,md5(cid::text||m.student_id::text) key,
    case when teacher or m.student_id=uid or m.share_name then u.display_name else 'Gizli Öğrenci' end name,m.student_id=uid own,
    coalesce(sum(l.amount),0) xp,(select coalesce(sum(z.amount),0) from public.class_xp_ledger z where z.class_id=cid and z.student_id=m.student_id) total_xp
   from public.class_memberships m join public.user_profiles u on u.id=m.student_id left join public.class_xp_ledger l on l.class_id=cid and l.student_id=m.student_id and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day
   where m.class_id=cid and ders_class_private.is_member(cid,m.student_id) group by m.student_id,m.share_name,u.display_name) x),
  'xp_history',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select l.* from public.class_xp_ledger l where l.class_id=cid and (teacher or l.student_id=uid) and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day order by l.created_at desc limit 200) x),
  'announcements',(select coalesce(jsonb_agg(a order by a.pinned desc,a.created_at desc),'[]') from public.class_announcements a where a.class_id=cid and a.deleted_at is null),
  'events',case when teacher then (select coalesce(jsonb_agg(x),'[]') from (select e.* from public.class_events e where e.class_id=cid order by e.created_at desc limit 100) x) else '[]'::jsonb end);
end $$;
revoke all on function ders_class_private.detail(uuid,jsonb) from public,anon,authenticated;

create function ders_class_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();cid uuid:=(p->>'class_id')::uuid;c public.school_classes%rowtype;role_name text;sid uuid;rid uuid;pid uuid;aid uuid;tid uuid;
 r public.class_requests%rowtype;t public.class_shared_tasks%rowtype;x public.class_contributions%rowtype;segment public.study_segments%rowtype;
 item jsonb;result jsonb;token text;teacher boolean;day date:=(now() at time zone 'Europe/Istanbul')::date;quantity bigint;correction uuid;linkclass uuid;
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 select role into role_name from public.user_profiles where id=uid;
 if role_name is null then raise exception 'Önce hesap türünü belirle.';end if;
 if p_action='overview' then
  return jsonb_build_object('role',role_name,'classes',(select coalesce(jsonb_agg(to_jsonb(cl)||jsonb_build_object('teacher_name',u.display_name,
    'active_members',(select count(*) from public.class_memberships m where m.class_id=cl.id and ders_class_private.is_member(cl.id,m.student_id))) order by cl.archived_at nulls first,cl.created_at desc),'[]')
    from public.school_classes cl join public.user_profiles u on u.id=cl.teacher_id where cl.teacher_id=uid or ders_class_private.is_member(cl.id,uid)),
   'requests',(select coalesce(jsonb_agg(to_jsonb(rq)||jsonb_build_object('class_name',cl.name,'teacher_name',u.display_name) order by rq.created_at desc),'[]') from public.class_requests rq join public.school_classes cl on cl.id=rq.class_id join public.user_profiles u on u.id=cl.teacher_id where rq.student_id=uid or cl.teacher_id=uid),
   'action_count',(select count(*) from public.class_requests rq join public.school_classes cl on cl.id=rq.class_id where cl.archived_at is null and rq.status='pending' and (role_name='teacher' and cl.teacher_id=uid and rq.kind='join' or role_name='student' and rq.student_id=uid and rq.kind='invite')));
 elsif p_action='create_class' then
  if role_name<>'teacher' then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
  cid:=(p->>'id')::uuid;
  if exists(select 1 from public.school_classes where id=cid) then
   if ders_class_private.is_teacher(cid) then return jsonb_build_object('id',cid,'idempotent',true);end if;
   raise exception 'Sınıf oluşturulamadı.';
  end if;
  insert into public.school_classes(id,teacher_id,name,description) values(cid,uid,btrim(p->>'name'),coalesce(p->>'description',''));
  insert into public.class_events(class_id,actor_id,action) values(cid,uid,p_action);
  return jsonb_build_object('id',cid);
 elsif p_action='join_link' then
  if role_name<>'student' then raise exception 'Öğrenci hesabıyla giriş yap.';end if;
  if (select count(*) from ders_private.invite_attempts where user_id=uid and attempted_at>now()-interval '10 minutes')>=30 then return jsonb_build_object('error','Çok fazla deneme. Biraz sonra tekrar dene.');end if;
  insert into ders_private.invite_attempts(user_id) values(uid);
  select l.class_id into cid from ders_class_private.invite_links l join public.school_classes sc on sc.id=l.class_id where l.token=p->>'token' and sc.archived_at is null;
  if cid is null then return jsonb_build_object('error','Davet bağlantısı geçersiz veya iptal edilmiş. Öğretmeninden güncel bağlantıyı iste.');end if;
 end if;
 select * into c from public.school_classes where id=cid for no key update;
 if not found then raise exception 'Sınıf bulunamadı veya erişim yok.' using errcode='42501';end if;
 teacher:=ders_class_private.is_teacher(cid);
 if p_action='detail' then return ders_class_private.detail(cid,p);end if;
 if p_action='join_link' then
  -- Recheck after acquiring the class lock: rotation/archive cannot race a join.
  if c.archived_at is not null or not exists(select 1 from ders_class_private.invite_links l where l.class_id=cid and l.token=p->>'token') then return jsonb_build_object('error','Davet bağlantısı artık geçerli değil.');end if;
  if ders_class_private.is_member(cid,uid) then return jsonb_build_object('class_id',cid,'status','active');end if;
  insert into public.class_requests(class_id,student_id,kind) values(cid,uid,'join') on conflict(class_id,student_id) where status='pending' do nothing returning id into rid;
  if rid is not null then
   perform ders_class_private.notice(cid,c.teacher_id,'join:'||rid,'Sınıf Katılım İsteği',uid);
   insert into public.class_events(class_id,actor_id,action,context) values(cid,uid,p_action,jsonb_build_object('request_id',rid));
  end if;
  return jsonb_build_object('class_id',cid,'status','pending');
 end if;
 if not teacher and not ders_class_private.is_member(cid,uid) and p_action not in('respond_requests','cancel_request') then raise exception 'Aktif sınıf üyeliği gerekli.' using errcode='42501';end if;
 if p_action='eligible_segments' then
  select * into t from public.class_shared_tasks where class_id=cid and id=(p->>'task_id')::uuid;
  if t.id is null or t.kind<>'duration' then raise exception 'Çalışma süresi görevi bulunamadı.';end if;
  return coalesce((select jsonb_agg(s order by s.started_at desc) from public.study_segments s join public.class_memberships m on m.class_id=cid and m.student_id=uid
   where s.user_id=uid and lower(btrim(s.category_name))=lower(btrim(t.subject)) and s.started_at>=m.joined_at
    and (s.started_at at time zone 'Europe/Istanbul')::date>=t.starts_on and (s.ended_at at time zone 'Europe/Istanbul')::date<=t.ends_on and s.ended_at<=now()
    and not exists(select 1 from public.class_contributions used where used.student_id=uid and used.segment_id=s.id)),'[]');
 end if;
 if c.archived_at is not null then raise exception 'Arşivlenmiş sınıfta yeni işlem yapılamaz.';end if;
 if p ? 'request_id' and exists(select 1 from public.class_events where id=(p->>'request_id')::uuid and class_id=cid and actor_id=uid) then return jsonb_build_object('ok',true,'idempotent',true);end if;
 if p_action in('update_class','archive_class','rotate_link','disable_link','invite','remove_member','send_program','pin_program','cancel_program','create_shared','cancel_shared','correct_contribution','save_announcement','delete_announcement') and not teacher then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 if p_action='update_class' then update public.school_classes set name=btrim(p->>'name'),description=coalesce(p->>'description','') where id=cid;
 elsif p_action='archive_class' then
  update public.school_classes set archived_at=now() where id=cid;delete from ders_class_private.invite_links where class_id=cid;
  update public.class_requests set status='cancelled',resolved_at=now() where class_id=cid and status='pending';
 elsif p_action='rotate_link' then
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into ders_class_private.invite_links(class_id,token) values(cid,token) on conflict(class_id) do update set token=excluded.token,created_at=now();result:=jsonb_build_object('token',token);
 elsif p_action='disable_link' then delete from ders_class_private.invite_links where class_id=cid;
 elsif p_action='invite' then
  if jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 1 and 200 then raise exception 'Öğrencileri seç.';end if;
  for item in select value from jsonb_array_elements(p->'student_ids') loop
   sid:=(item#>>'{}')::uuid;
   if not exists(select 1 from public.student_teacher_connections conn join public.user_profiles u on u.id=conn.student_id and u.role='student' where conn.teacher_id=uid and conn.student_id=sid and conn.status='approved') then raise exception 'Yalnızca bağlı öğrencileri davet edebilirsin.';end if;
   if not ders_class_private.is_member(cid,sid) then
    insert into public.class_requests(class_id,student_id,kind) values(cid,sid,'invite') on conflict(class_id,student_id) where status='pending' do nothing returning id into rid;
    if rid is not null then perform ders_class_private.notice(cid,sid,'invite:'||rid,'Sınıf Daveti',uid);end if;
   end if;
  end loop;
 elsif p_action='respond_requests' then
  if coalesce(p->>'status','') not in('accepted','rejected') or jsonb_typeof(p->'ids') is distinct from 'array' or jsonb_array_length(p->'ids') not between 1 and 200 then raise exception 'Geçerli yanıt ve istek seç.';end if;
  for item in select value from jsonb_array_elements(p->'ids') loop
   select * into r from public.class_requests where id=(item#>>'{}')::uuid and class_id=cid for update;
   if not found or not (teacher and r.kind='join' or r.student_id=uid and r.kind='invite') then raise exception 'Bu isteği yanıtlayamazsın.' using errcode='42501';end if;
   if r.status<>'pending' then continue;end if;
   if p->>'status'='accepted' then
    if teacher then
     insert into public.student_teacher_connections(teacher_id,student_id,status,approved_at) values(c.teacher_id,r.student_id,'approved',now())
      on conflict(teacher_id,student_id) do update set status='approved',approved_at=now();
    elsif not exists(select 1 from public.student_teacher_connections where teacher_id=c.teacher_id and student_id=uid and status='approved') then raise exception 'Öğretmen bağlantısı sona ermiş.';end if;
    insert into public.class_memberships(class_id,student_id,status) values(cid,r.student_id,'active') on conflict(class_id,student_id) do update set status='active',joined_at=now(),left_at=null,share_name=false,share_exams=false,share_study=false;
   end if;
   update public.class_requests set status=p->>'status',resolved_at=now() where id=r.id;
   perform ders_class_private.notice(cid,case when teacher then r.student_id else c.teacher_id end,'response:'||r.id,'Sınıf İsteği '||case when p->>'status'='accepted' then 'Kabul Edildi' else 'Reddedildi' end,uid);
  end loop;
 elsif p_action='cancel_request' then
  select * into r from public.class_requests where class_id=cid and id=(p->>'id')::uuid for update;
  if not found or not(teacher or r.student_id=uid and r.kind='join') then raise exception 'Bu isteği iptal edemezsin.' using errcode='42501';end if;
  update public.class_requests set status='cancelled',resolved_at=now() where id=r.id and status='pending';
 elsif p_action in('leave','remove_member') then
  sid:=case when p_action='leave' then uid else (p->>'student_id')::uuid end;
  update public.class_memberships set status=case when p_action='leave' then 'left' else 'removed' end,left_at=now(),share_exams=false,share_study=false,share_name=false where class_id=cid and student_id=sid and status='active';
 elsif p_action='preferences' then
  update public.class_memberships set share_name=coalesce((p->>'share_name')::boolean,false),share_exams=coalesce((p->>'share_exams')::boolean,false),share_study=coalesce((p->>'share_study')::boolean,false) where class_id=cid and student_id=uid and status='active';
 elsif p_action='send_program' then
  pid:=(p->>'id')::uuid;
  if exists(select 1 from public.class_programs where id=pid) then raise exception 'Bu program daha önce gönderildi.';end if;
  if jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 1 and 200 then raise exception 'En az bir aktif öğrenci seç.';end if;
  insert into public.class_programs(id,class_id,name,starts_on,ends_on) values(pid,cid,btrim(p->>'week_name'),(p->>'starts_on')::date,(p->>'ends_on')::date);
  for sid in select distinct (value#>>'{}')::uuid from jsonb_array_elements(p->'student_ids') loop
   if not ders_class_private.is_member(cid,sid) then raise exception 'Seçilen öğrenci aktif sınıf üyesi değil.';end if;
   result:=ders_private.action('assign_program',jsonb_build_object('student_id',sid,'week_name',p->>'week_name','week_range',to_char((p->>'starts_on')::date,'DD.MM.YYYY')||' – '||to_char((p->>'ends_on')::date,'DD.MM.YYYY'),'quests',p->'quests'));
   aid:=(result->>'assignment_id')::uuid;
   insert into public.class_program_recipients(program_id,class_id,student_id,assignment_id) values(pid,cid,sid,aid);
  end loop;
 elsif p_action='pin_program' then update public.class_programs set pinned=coalesce((p->>'pinned')::boolean,false) where class_id=cid and id=(p->>'id')::uuid;
 elsif p_action='cancel_program' then
  pid:=(p->>'id')::uuid;
  for item in select to_jsonb(a) from public.class_program_recipients r join public.teacher_plan_assignments a on a.id=r.assignment_id where r.class_id=cid and r.program_id=pid and exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=r.student_id and status='approved') loop
   if item->>'status'='pending' then perform ders_private.action('withdraw_assignment',jsonb_build_object('id',item->>'id'));
   elsif item->>'status'='accepted' and item->>'archived_at' is null then perform ders_control_private.action('archive_assignment',jsonb_build_object('assignment_id',item->>'id'));end if;
  end loop;
  update public.class_programs set cancelled_at=now() where class_id=cid and id=pid;
 elsif p_action='create_shared' then
  insert into public.class_shared_tasks(id,class_id,name,subject,description,kind,target,starts_on,ends_on,xp_pool)
   values((p->>'id')::uuid,cid,btrim(p->>'name'),btrim(p->>'subject'),coalesce(p->>'description',''),p->>'kind',(p->>'target')::bigint,(p->>'starts_on')::date,(p->>'ends_on')::date,(p->>'xp_pool')::integer);
 elsif p_action='cancel_shared' then
  update public.class_shared_tasks set status='cancelled' where class_id=cid and id=(p->>'id')::uuid and settled_at is null;
 elsif p_action in('contribute_questions','contribute_segments','correct_contribution') then
  select * into t from public.class_shared_tasks where class_id=cid and id=(p->>'task_id')::uuid for update;
  if not found then raise exception 'Ortak görev bulunamadı.';end if;
  if p_action='correct_contribution' then
   if length(btrim(coalesce(p->>'reason',''))) not between 1 and 2000 then raise exception 'Düzeltme gerekçesi gerekli.';end if;
   select * into x from public.class_contributions where id=(p->>'id')::uuid and task_id=t.id for update;
   if not found then raise exception 'Katkı bulunamadı.';end if;
   quantity:=(p->>'amount')::bigint;
   if quantity<0 or quantity>(case when x.segment_id is null then 1000000 else (select duration_ms from public.study_segments where user_id=x.student_id and id=x.segment_id) end) or quantity::numeric<>(p->>'amount')::numeric then raise exception 'Geçersiz düzeltme miktarı.';end if;
   correction:=(p->>'request_id')::uuid;if correction is null then raise exception 'Düzeltme işlem kimliği gerekli.';end if;
   update public.class_contributions set amount=quantity,corrected_at=now() where id=x.id;
   perform ders_class_private.settle(t.id,correction);
   p:=p||jsonb_build_object('previous_amount',x.amount,'new_amount',quantity);
  else
   if role_name<>'student' or not ders_class_private.is_member(cid,uid) then raise exception 'Aktif öğrenci üyeliği gerekli.' using errcode='42501';end if;
   if t.status<>'open' or day<t.starts_on or day>t.ends_on then raise exception 'Görev katkıya açık değil.';end if;
   if p_action='contribute_questions' then
    if t.kind<>'questions' or jsonb_typeof(p->'amount')<>'number' or (p->>'amount')::numeric<>trunc((p->>'amount')::numeric) then raise exception 'Pozitif tam sayı gir.';end if;
    quantity:=(p->>'amount')::bigint;if quantity not between 1 and 1000000 then raise exception 'Soru sayısı 1–1000000 arasında olmalı.';end if;
    if coalesce((p->>'date')::date,day) not between t.starts_on and least(t.ends_on,day) or coalesce((p->>'date')::date,day)<(select (joined_at at time zone 'Europe/Istanbul')::date from public.class_memberships where class_id=cid and student_id=uid) then raise exception 'Katkı tarihi görev ve üyelik aralığında olmalı.';end if;
    insert into public.class_contributions(id,task_id,class_id,student_id,amount,contribution_date,note) values((p->>'id')::uuid,t.id,cid,uid,quantity,coalesce((p->>'date')::date,day),coalesce(p->>'note',''));
   else
    if t.kind<>'duration' or jsonb_typeof(p->'segment_ids') is distinct from 'array' or jsonb_array_length(p->'segment_ids') not between 1 and 100 then raise exception 'Geçerli çalışma kayıtlarını seç.';end if;
    for item in select value from jsonb_array_elements(p->'segment_ids') loop
     select s.* into segment from public.study_segments s join public.class_memberships m on m.class_id=cid and m.student_id=uid
      where s.user_id=uid and s.id=item#>>'{}' and lower(btrim(s.category_name))=lower(btrim(t.subject)) and s.started_at>=m.joined_at and s.ended_at<=now()
       and (s.started_at at time zone 'Europe/Istanbul')::date>=t.starts_on and (s.ended_at at time zone 'Europe/Istanbul')::date<=t.ends_on;
     if not found then raise exception 'Çalışma kaydı ders, tarih veya üyelikle uyuşmuyor.';end if;
     insert into public.class_contributions(id,task_id,class_id,student_id,amount,segment_id,contribution_date)
      values(gen_random_uuid(),t.id,cid,uid,segment.duration_ms,segment.id,(segment.started_at at time zone 'Europe/Istanbul')::date);
    end loop;
   end if;
   perform ders_class_private.settle(t.id);
  end if;
 elsif p_action='save_announcement' then
  pid:=(p->>'id')::uuid;
  if exists(select 1 from public.class_announcements where id=pid and class_id<>cid) then raise exception 'Duyuru düzenlenemez.';end if;
  insert into public.class_announcements(id,class_id,title,body,pinned) values(pid,cid,btrim(p->>'title'),btrim(p->>'body'),coalesce((p->>'pinned')::boolean,false))
   on conflict(id) do update set title=excluded.title,body=excluded.body,pinned=excluded.pinned,updated_at=now();
  if not (p->>'editing')::boolean is true then
   for sid in select student_id from public.class_memberships where class_id=cid and ders_class_private.is_member(cid,student_id) loop
    perform ders_class_private.notice(cid,sid,'announcement:'||pid,'Sınıf Duyurusu',uid);
   end loop;
  end if;
 elsif p_action='delete_announcement' then update public.class_announcements set deleted_at=now() where class_id=cid and id=(p->>'id')::uuid;
 else raise exception 'Bilinmeyen sınıf işlemi.';
 end if;
 insert into public.class_events(id,class_id,actor_id,action,context) values(coalesce((p->>'request_id')::uuid,gen_random_uuid()),cid,uid,p_action,p-'token'-'quests'-'body'-'description');
 return coalesce(result,'{}')||jsonb_build_object('ok',true,'class_id',cid);
end $$;
revoke all on function ders_class_private.action(text,jsonb) from public,anon;
grant execute on function ders_class_private.action(text,jsonb) to authenticated;
create function public.ders_classes(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ders_class_private.action(p_action,p_payload)$$;
revoke all on function public.ders_classes(text,jsonb) from public,anon;
grant execute on function public.ders_classes(text,jsonb) to authenticated;

-- Enrich existing change requests; no replacement request system and no old rows rewritten.
alter function ders_private.action(text,jsonb) rename to action_before_classes;
revoke all on function ders_private.action_before_classes(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;pending jsonb;resolved jsonb;resolved_row public.quest_change_requests%rowtype;notice_assignment uuid;notice_week text;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 result:=ders_private.action_before_classes(p_action,p_payload);
 if p_action='overview' then
  select coalesce(jsonb_agg(x) filter(where x->>'status'='pending'),'[]'),coalesce(jsonb_agg(x) filter(where x->>'status'<>'pending'),'[]') into pending,resolved
  from (select to_jsonb(r)||jsonb_build_object('name',s.display_name,'teacher_name',u.display_name,'title',q.title,'category_name',q.category_name,'week_name',a.week_name,'assignment_id',a.id) x
   from public.quest_change_requests r join public.teacher_assigned_quests q on q.id=r.quest_id join public.teacher_plan_assignments a on a.id=q.assignment_id
   join public.user_profiles s on s.id=r.student_id join public.user_profiles u on u.id=r.teacher_id
   where r.student_id=auth.uid() or r.teacher_id=auth.uid() and exists(select 1 from public.student_teacher_connections where teacher_id=auth.uid() and student_id=r.student_id and status='approved') order by r.created_at desc) records;
  result:=result||jsonb_build_object('requests',pending,'request_history',resolved);
 elsif p_action='resolve_change' then
  select * into resolved_row from public.quest_change_requests where id=(p_payload->>'id')::uuid and teacher_id=auth.uid() and status<>'pending';
  if found then
   select a.id,a.week_id into notice_assignment,notice_week from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id where q.id=resolved_row.quest_id;
   perform ders_learning_private.notify(resolved_row.student_id,'change:'||resolved_row.id||':'||resolved_row.status,'feedback',auth.uid(),resolved_row.student_id,notice_week,'teacher-quest-'||resolved_row.quest_id,notice_assignment);
  end if;
 end if;
 return result;
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
create or replace function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ders_private.action(p_action,p_payload)$$;
notify pgrst,'reload schema';
commit;
