-- v1.5.0 M1. No existing user records, XP, boards or policies are rewritten.
create table ders_class_private.membership_periods (
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.school_classes(id),
 student_id uuid not null references public.user_profiles(id),starts_at timestamptz not null,ends_at timestamptz,
 check(ends_at is null or ends_at>=starts_at)
);
create unique index class_membership_open_period on ders_class_private.membership_periods(class_id,student_id) where ends_at is null;
create index class_membership_period_lookup on ders_class_private.membership_periods(class_id,student_id,starts_at);
create table ders_class_private.connection_periods (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.user_profiles(id),
 student_id uuid not null references public.user_profiles(id),starts_at timestamptz not null,ends_at timestamptz,
 check(ends_at is null or ends_at>=starts_at)
);
create unique index class_connection_open_period on ders_class_private.connection_periods(teacher_id,student_id) where ends_at is null;
create index class_connection_period_lookup on ders_class_private.connection_periods(teacher_id,student_id,starts_at);
alter table ders_class_private.membership_periods enable row level security;
alter table ders_class_private.connection_periods enable row level security;
revoke all on ders_class_private.membership_periods,ders_class_private.connection_periods from public,anon,authenticated;
-- Only known intervals are backfilled. Earlier, overwritten membership periods cannot be inferred.
insert into ders_class_private.membership_periods(class_id,student_id,starts_at,ends_at)
 select class_id,student_id,joined_at,case when status='active' then null else greatest(joined_at,coalesce(left_at,now())) end from public.class_memberships;
insert into ders_class_private.connection_periods(teacher_id,student_id,starts_at)
 select teacher_id,student_id,greatest(created_at,coalesce(approved_at,now())) from public.student_teacher_connections where status='approved';

create function ders_class_private.track_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.status='active' and (new.status<>'active' or new.joined_at<>old.joined_at) then
  update ders_class_private.membership_periods set ends_at=greatest(starts_at,coalesce(new.left_at,now())) where class_id=old.class_id and student_id=old.student_id and ends_at is null;
 end if;
 if new.status='active' and (tg_op='INSERT' or old.status<>'active' or new.joined_at<>old.joined_at) then
  insert into ders_class_private.membership_periods(class_id,student_id,starts_at) values(new.class_id,new.student_id,new.joined_at) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger class_membership_period_change after insert or update on public.class_memberships for each row execute function ders_class_private.track_membership();
create function ders_class_private.track_connection() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.status='approved' and new.status<>'approved' then
  update ders_class_private.connection_periods set ends_at=greatest(starts_at,now()) where teacher_id=old.teacher_id and student_id=old.student_id and ends_at is null;
 end if;
 if new.status='approved' and (tg_op='INSERT' or old.status<>'approved') then
  insert into ders_class_private.connection_periods(teacher_id,student_id,starts_at) values(new.teacher_id,new.student_id,coalesce(new.approved_at,now())) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger class_connection_period_change after insert or update on public.student_teacher_connections for each row execute function ders_class_private.track_connection();
revoke all on function ders_class_private.track_membership(),ders_class_private.track_connection() from public,anon,authenticated;

create function ders_class_private.eligible_spans(cid uuid,sid uuid)
 returns table(starts_at timestamptz,ends_at timestamptz) language sql stable security definer set search_path='' as $$
 select greatest(mp.starts_at,cp.starts_at,c.created_at),least(coalesce(mp.ends_at,now()),coalesce(cp.ends_at,now()))
 from public.school_classes c join public.class_memberships m on m.class_id=c.id and m.student_id=sid and m.status='active'
 join ders_class_private.membership_periods mp on mp.class_id=c.id and mp.student_id=sid and mp.ends_at is null
 join ders_class_private.connection_periods cp on cp.teacher_id=c.teacher_id and cp.student_id=sid
 where c.id=cid and ders_class_private.is_member(cid,sid)
  and greatest(mp.starts_at,cp.starts_at,c.created_at)<least(coalesce(mp.ends_at,now()),coalesce(cp.ends_at,now()))
$$;
create function ders_class_private.eligible_record(cid uuid,sid uuid,first_at timestamptz,last_at timestamptz)
 returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from ders_class_private.eligible_spans(cid,sid) s where first_at>=s.starts_at and last_at<=s.ends_at)
$$;
create function ders_class_private.eligible_exam(cid uuid,sid uuid,exam_day date,recorded_at timestamptz)
 returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from ders_class_private.eligible_spans(cid,sid) s
  where exam_day between (s.starts_at at time zone 'Europe/Istanbul')::date and (s.ends_at at time zone 'Europe/Istanbul')::date
   and recorded_at>=s.starts_at and recorded_at<=s.ends_at)
$$;
revoke all on function ders_class_private.eligible_spans(uuid,uuid),ders_class_private.eligible_record(uuid,uuid,timestamptz,timestamptz),ders_class_private.eligible_exam(uuid,uuid,date,timestamptz) from public,anon,authenticated;

create or replace function ders_class_private.stats(cid uuid,first_day date,last_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;teacher boolean:=ders_class_private.is_teacher(cid);
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 with members as materialized (
  select m.student_id,m.share_study,m.share_exams from public.class_memberships m where m.class_id=cid and ders_class_private.is_member(cid,m.student_id)
 ), days as (
  select distinct m.student_id,d::date as day from members m cross join lateral ders_class_private.eligible_spans(cid,m.student_id) s
   cross join lateral generate_series(greatest(first_day,(s.starts_at at time zone 'Europe/Istanbul')::date),least(last_day,(s.ends_at at time zone 'Europe/Istanbul')::date),interval '1 day') d
   where teacher or m.share_study
 ), time_rows as materialized (
  select s.* from public.study_segments s join members m on m.student_id=s.user_id
   where (teacher or m.share_study) and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day
    and ders_class_private.eligible_record(cid,s.user_id,s.started_at,s.ended_at)
 ), exams as materialized (
  select e.*,(select string_agg(g->>'id',',' order by g->>'id') from jsonb_array_elements(e.groups) g) scope
   from public.practice_exams e join members m on m.student_id=e.user_id
   where (teacher or m.share_exams) and e.exam_date between first_day and last_day and ders_class_private.eligible_exam(cid,e.user_id,e.exam_date,e.created_at)
 ), latest as (
  select distinct on(user_id,exam_type,scope) * from exams where not is_partial and total_net is not null order by user_id,exam_type,scope,exam_date desc,created_at desc,id
 ), averages as (
  select exam_type,scope,maximum,count(*) participants,round(avg(total_net),2) average from latest group by exam_type,scope,maximum having teacher or count(*)>=3
 ), parts as (
  select exam_type,scope,k.key part,round(avg((k.value->>'correct')::numeric-(k.value->>'wrong')::numeric/4),2) net,count(*) participants
   from latest,jsonb_each(results) k where k.value->>'correct' is not null and k.value->>'wrong' is not null group by exam_type,scope,k.key having teacher or count(*)>=3
 ), daily_last as (
  select distinct on(user_id,exam_type,scope,exam_date) * from exams where not is_partial and total_net is not null order by user_id,exam_type,scope,exam_date,created_at desc,id
 ), trend as (
  select exam_type,scope,exam_date as day,round(avg(total_net),2) average,count(*) participants from daily_last group by exam_type,scope,exam_date having teacher
 ), totals as (
  select coalesce(sum(duration_ms),0) total_ms,count(distinct user_id) participants,count(distinct (user_id,(started_at at time zone 'Europe/Istanbul')::date)) active_days from time_rows
 ) select jsonb_build_object('active_members',(select count(*) from members),'starts_on',first_day,'ends_on',last_day,
  'study',case when teacher or (select participants>=3 from totals) then jsonb_build_object(
   'total_ms',(select total_ms from totals),'participants',(select participants from totals),
   'eligible_members',(select count(distinct student_id) from days),'member_days',(select count(*) from days),
   'per_member_ms',(select total_ms/nullif((select count(distinct student_id) from days),0) from totals),
   'daily_average_ms',(select total_ms/nullif((select count(*) from days),0) from totals),
   'active_day_average_ms',(select total_ms/nullif(active_days,0) from totals),
   'by_day',case when teacher then (select coalesce(jsonb_agg(x order by x.day),'[]') from (select (started_at at time zone 'Europe/Istanbul')::date as day,sum(duration_ms) duration_ms,count(distinct user_id) participants from time_rows group by 1) x) else '[]'::jsonb end,
   'by_subject',case when teacher then (select coalesce(jsonb_agg(x),'[]') from (select category_name subject,sum(duration_ms) duration_ms,count(distinct user_id) participants from time_rows group by 1) x) else '[]'::jsonb end
  ) else null end,
  'exams',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('subjects',(select coalesce(jsonb_agg(p),'[]') from parts p where p.exam_type=a.exam_type and p.scope=a.scope))),'[]') from averages a),
  'exam_trend',(select coalesce(jsonb_agg(t order by t.day),'[]') from trend t),
  'partial_exams',case when teacher then (select count(*) from exams where is_partial) else null end,
  'average_method','Her öğrenci için dönem içindeki son tam deneme; TYT/AYT ve kapsamlar ayrı. Paylaşım izni olmayan öğrenci, arkadaşlarına gösterilen ortalamaya katılmaz.',
  'trend_method','Günlük son tam denemeler. Küçük grup çıkarımını önlemek için ayrıntılı seri yalnızca yetkili öğretmene gösterilir.',
  'study_method','Yalnızca güncel sınıf üyelik dönemi ile onaylı bağlantı dönemlerinin kesişimi. Takvim ortalaması uygun öğrenci-gün sayısına, aktif gün ortalaması kayıt bulunan öğrenci-gün sayısına bölünür. Arkadaş özeti için en az üç paylaşım yapan katılımcı gerekir.'
 ) into result;
 return result;
end $$;

alter function ders_class_private.detail(uuid,jsonb) rename to detail_v130;
create function ders_class_private.detail(cid uuid,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;first_day date;last_day date;today date:=(now() at time zone 'Europe/Istanbul')::date;created date;teacher boolean:=ders_class_private.is_teacher(cid);mode text:=coalesce(p->>'period','week');
begin
 if not ders_class_private.can_read(cid) then raise exception 'Bu sınıfa erişim yok.' using errcode='42501';end if;
 select (created_at at time zone 'Europe/Istanbul')::date into created from public.school_classes where id=cid;
 if not teacher and mode not in('week','month','all') then raise exception 'Bu dönem yalnızca öğretmene açık.' using errcode='42501';end if;
 first_day:=case mode when 'all' then created when 'month' then coalesce(date_trunc('month',(p->>'month')::date)::date,date_trunc('month',today)::date)
  when 'year' then make_date((p->>'year')::integer,1,1) when 'custom' then (p->>'starts_on')::date else coalesce((p->>'week_start')::date,date_trunc('week',today)::date) end;
 last_day:=case mode when 'all' then today when 'month' then (first_day+interval '1 month'-interval '1 day')::date when 'year' then (first_day+interval '1 year'-interval '1 day')::date when 'custom' then (p->>'ends_on')::date else first_day+6 end;
 if first_day is null or last_day is null or last_day<first_day or first_day<date '2000-01-01' or last_day>date '2200-01-01' then raise exception 'Geçerli bir tarih aralığı seç.' using errcode='22023';end if;
 -- The legacy renderer is retained; every sensitive field is rebuilt with the new scope below.
 result:=ders_class_private.detail_v130(cid,p||jsonb_build_object('period','week','week_start',first_day));
 result:=jsonb_set(result,'{programs}',coalesce((select jsonb_agg(cp||jsonb_build_object('recipients',(
  select coalesce(jsonb_agg(r||jsonb_build_object('archived_at',(select a.archived_at from public.teacher_plan_assignments a where a.id=(r->>'assignment_id')::uuid))),'[]') from jsonb_array_elements(cp->'recipients') r))) from jsonb_array_elements(result->'programs') cp),'[]'));
 result:=jsonb_set(result,'{statistics}',ders_class_private.stats(cid,greatest(first_day,created),least(last_day,today)));
 result:=jsonb_set(result,'{members}',coalesce((select jsonb_agg(m||jsonb_build_object('study_ms',case when teacher or (m->>'student_id')::uuid=auth.uid() then (
  select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=(m->>'student_id')::uuid
   and (s.started_at at time zone 'Europe/Istanbul')::date between greatest(first_day,created) and least(last_day,today)
   and ders_class_private.eligible_record(cid,s.user_id,s.started_at,s.ended_at)) else null end)) from jsonb_array_elements(result->'members') m),'[]'));
 result:=jsonb_set(result,'{shared_profiles}',case when teacher then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object(
  'key',md5(cid::text||m.student_id::text),'name',case when m.share_name then u.display_name else 'Gizli Öğrenci' end,
  'exams',case when m.share_exams then (select coalesce(jsonb_agg(x),'[]') from (select distinct on(e.exam_type,e.groups) e.exam_type,e.name,e.exam_date,e.total_net,e.maximum,e.is_partial,e.groups,e.results from public.practice_exams e
    where e.user_id=m.student_id and e.exam_date between greatest(first_day,created) and least(last_day,today) and ders_class_private.eligible_exam(cid,e.user_id,e.exam_date,e.created_at) order by e.exam_type,e.groups,e.exam_date desc,e.created_at desc) x) else null end,
  'study_ms',case when m.share_study then (select coalesce(sum(s.duration_ms),0) from public.study_segments s where s.user_id=m.student_id
    and (s.started_at at time zone 'Europe/Istanbul')::date between greatest(first_day,created) and least(last_day,today) and ders_class_private.eligible_record(cid,s.user_id,s.started_at,s.ended_at)) else null end))
   from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and m.student_id<>auth.uid() and ders_class_private.is_member(cid,m.student_id) and (m.share_exams or m.share_study)),'[]') end);
 return result;
end $$;
revoke all on function ders_class_private.detail(uuid,jsonb),ders_class_private.detail_v130(uuid,jsonb) from public,anon,authenticated;

-- Preserve the legacy action implementation. New terminal invite errors have stable codes.
alter function ders_class_private.action(text,jsonb) rename to action_v130;
create function ders_class_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;item jsonb;entry jsonb;cid uuid:=(p->>'class_id')::uuid;results jsonb:='[]';uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if p_action='approve_requests' then
  if not ders_class_private.is_teacher(cid) then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
  if jsonb_typeof(p->'ids') is distinct from 'array' or jsonb_array_length(p->'ids') not between 1 and 200 then raise exception 'En az bir katılım isteği seç.' using errcode='22023';end if;
  for item in select distinct value from jsonb_array_elements(p->'ids') loop
   begin
    if not exists(select 1 from public.class_requests where id=(item#>>'{}')::uuid and class_id=cid and kind='join') then raise exception 'İstek bulunamadı.';end if;
    entry:=ders_class_private.action_v130('respond_requests',jsonb_build_object('class_id',cid,'ids',jsonb_build_array(item),'status','accepted'));
    results:=results||jsonb_build_array(jsonb_build_object('id',item,'ok',true));
   exception when others then results:=results||jsonb_build_array(jsonb_build_object('id',item,'ok',false,'error','İstek kabul edilemedi. Güncel üyeliği ve bağlantıyı kontrol et.'));
   end;
  end loop;
  return jsonb_build_object('ok',true,'results',results);
 end if;
 result:=ders_class_private.action_v130(p_action,p);
 if p_action='join_link' and result ? 'error' and result->>'error' like 'Davet bağlantısı%' then result:=result||jsonb_build_object('code','invite_invalid','retryable',false);end if;
 return result;
end $$;
revoke all on function ders_class_private.action_v130(text,jsonb) from public,anon,authenticated;
revoke all on function ders_class_private.action(text,jsonb) from public,anon;
grant execute on function ders_class_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';
