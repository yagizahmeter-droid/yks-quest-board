-- Teacher-only, read-only analysis. No existing rows, XP, policies or grants are rewritten.
create function ders_workspace_private.analysis_period(cid uuid,p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare mode text:=coalesce(p->>'period','week');a date;b date;today date:=(now() at time zone 'Europe/Istanbul')::date;created date;
begin
 if not ders_class_private.is_teacher(cid) then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 select (created_at at time zone 'Europe/Istanbul')::date into created from public.school_classes where id=cid;
 if mode='all' then a:=created;b:=today;
 elsif mode='week' then a:=coalesce(ders_workspace_private.date_value(p->>'week_start'),date_trunc('week',today)::date);b:=a+6;if p ? 'week_start' and ders_workspace_private.date_value(p->>'week_start') is null then raise exception 'Geçerli hafta seç.' using errcode='22023';end if;
 elsif mode='month' then a:=ders_workspace_private.date_value(coalesce(p->>'month',to_char(today,'YYYY-MM')||'-01'));if a is not null then a:=date_trunc('month',a)::date;b:=(a+interval '1 month'-interval '1 day')::date;end if;
 elsif mode='year' then if p->>'year'!~'^\d{4}$' then raise exception 'Geçerli yıl seç.' using errcode='22023';end if;a:=make_date((p->>'year')::int,1,1);b:=make_date((p->>'year')::int,12,31);
 elsif mode='custom' then a:=ders_workspace_private.date_value(p->>'starts_on');b:=ders_workspace_private.date_value(p->>'ends_on');
 end if;
 if a is null or b is null or b<a or a<date '2000-01-01' or b>date '2200-12-31' or b-a>36600 then raise exception 'Geçerli dönem seç. En uzun özel aralık 100 yıldır.' using errcode='22023';end if;
 return jsonb_build_object('mode',mode,'requested_start',a,'requested_end',b,'starts_on',greatest(a,created),'ends_on',least(b,today),'empty',greatest(a,created)>least(b,today),'time_zone','Europe/Istanbul');
end $$;

-- Use the same validated date scope throughout teacher class screens and reports.
alter function ders_class_private.period(uuid,jsonb) rename to period_m2;
create function ders_class_private.period(cid uuid,p jsonb) returns table(first_day date,last_day date)
language plpgsql stable security definer set search_path='' as $$
declare dates jsonb;
begin
 if ders_class_private.is_teacher(cid) then dates:=ders_workspace_private.analysis_period(cid,p);first_day:=(dates->>'starts_on')::date;last_day:=(dates->>'ends_on')::date;return next;
 else return query select * from ders_class_private.period_m2(cid,p);end if;
end $$;
revoke all on function ders_class_private.period(uuid,jsonb),ders_class_private.period_m2(uuid,jsonb) from public,anon,authenticated;

create function ders_workspace_private.student_analysis(cid uuid,sid uuid,first_day date,last_day date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not ders_class_private.is_teacher(cid) or not ders_workspace_private.allowed(sid) or not ders_class_private.is_member(cid,sid) then raise exception 'Etkin üyelik ve öğretmen bağlantısı gerekli.' using errcode='42501';end if;
 with recipients as materialized (
  select a.* from public.class_program_recipients r join public.class_programs cp on cp.id=r.program_id join public.teacher_plan_assignments a on a.id=r.assignment_id
  where cp.class_id=cid and r.student_id=sid and cp.cancelled_at is null and cp.starts_on<=last_day and cp.ends_on>=first_day and ders_class_private.eligible_record(cid,sid,a.created_at,a.created_at)
 ), qs as materialized (
  select q.*,ders_class_private.quest_count(sid,a.id,q) units from recipients a join public.teacher_assigned_quests q on q.assignment_id=a.id
  where a.status='accepted' and a.archived_at is null and q.archived_at is null
 ), totals as (
  select count(*) total,count(*) filter(where units>=repeat_target) done,coalesce(sum(units),0) units,coalesce(sum(repeat_target),0) targets from qs
 ), segments as materialized (
  select s.* from public.study_segments s where s.user_id=sid and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,sid,s.started_at,s.ended_at)
 ), exams as materialized (
  select e.*,(select jsonb_agg(g order by g->>'id')::text from jsonb_array_elements(e.groups) g) scope from public.practice_exams e
   where e.user_id=sid and e.exam_date between first_day and last_day and ders_class_private.eligible_exam(cid,sid,e.exam_date,e.created_at)
 ), full_exams as (
  select distinct on(exam_type,scope,maximum) e.*,
   first_value(total_net) over(partition by exam_type,scope,maximum order by exam_date,created_at,id) first_net,
   count(*) over(partition by exam_type,scope,maximum) samples
  from exams e where not is_partial and total_net is not null order by exam_type,scope,maximum,exam_date desc,created_at desc,id desc
 ) select jsonb_build_object('id',sid,'name',(select display_name from public.user_profiles where id=sid),
 'homework',(select to_jsonb(t)||jsonb_build_object('percent',round(t.units*100.0/nullif(t.targets,0)),'completion_percent',round(t.done*100.0/nullif(t.total,0)),
   'by_subject',(select coalesce(jsonb_agg(x order by x.done desc,x.subject),'[]') from (select category_name subject,count(*) total,count(*) filter(where units>=repeat_target) done,sum(units) units,sum(repeat_target) targets from qs group by category_name) x),
   'incomplete',(select coalesce(jsonb_agg(x),'[]') from (select id,coalesce(custom_title,title) title,category_name subject,units,repeat_target target from qs where units<repeat_target order by units desc,sort_order,id limit 20) x)) from totals t),
 'acceptance',jsonb_build_object('sent',(select count(*) from recipients),'accepted',(select count(*) from recipients where status='accepted' and archived_at is null),'pending',(select count(*) from recipients where status='pending' and archived_at is null),'rejected',(select count(*) from recipients where status='rejected'),'withdrawn',(select count(*) from recipients where status='withdrawn'),'archived',(select count(*) from recipients where archived_at is not null)),
 'study',jsonb_build_object('duration_ms',(select coalesce(sum(duration_ms),0) from segments),'records',(select count(*) from segments),
   'by_subject',(select coalesce(jsonb_agg(x order by x.duration_ms desc),'[]') from (select category_name subject,sum(duration_ms) duration_ms from segments group by category_name) x),
   'by_day',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select (started_at at time zone 'Europe/Istanbul')::date as day,sum(duration_ms) duration_ms from segments group by 1) x)),
 'exams',(select coalesce(jsonb_agg(jsonb_build_object('exam_type',exam_type,'scope',scope,'maximum',maximum,'last_net',total_net,'first_net',first_net,'change',case when samples>=2 then total_net-first_net end,'samples',samples,'date',exam_date,'results',results) order by exam_type,scope),'[]') from full_exams),
 'partial_exams',(select count(*) from exams where is_partial),
 'class_xp',(select coalesce(sum(amount),0) from public.class_xp_ledger l where l.class_id=cid and l.student_id=sid and (l.created_at at time zone 'Europe/Istanbul')::date between first_day and last_day and ders_class_private.eligible_record(cid,sid,l.created_at,l.created_at))
 ) into result;return result;
end $$;

create function ders_workspace_private.analysis_snapshot(cid uuid,a date,b date,chosen jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare students jsonb;result jsonb;
begin
 if not ders_class_private.is_teacher(cid) then raise exception 'Sınıfın öğretmeni yetkili.' using errcode='42501';end if;
 select coalesce(jsonb_agg(ders_workspace_private.student_analysis(cid,m.student_id,a,b) order by u.display_name,m.student_id),'[]') into students
  from public.class_memberships m join public.user_profiles u on u.id=m.student_id where m.class_id=cid and ders_class_private.is_member(cid,m.student_id) and (chosen is null or chosen ? m.student_id::text);
 with items as (select x from jsonb_array_elements(students) x), exams as (
  select x->>'id' sid,e,e->>'exam_type' exam_type,e->>'scope' scope,(e->>'maximum')::numeric maximum from items,jsonb_array_elements(x->'exams') e
 ), exam_avg as (
  select exam_type,scope,maximum,count(*) participants,round(avg((e->>'last_net')::numeric),2) average from exams group by exam_type,scope,maximum
 ), exam_parts as (
  select exam_type,scope,maximum,k.key subject,round(avg((k.value->>'correct')::numeric-(k.value->>'wrong')::numeric/4),2) net,count(*) participants from exams,jsonb_each(e->'results') k where k.value->>'correct' is not null and k.value->>'wrong' is not null group by exam_type,scope,maximum,k.key
 ), totals as (
  select count(*) active_students,coalesce(sum((x->'acceptance'->>'sent')::int),0) sent,coalesce(sum((x->'acceptance'->>'accepted')::int),0) accepted,
   coalesce(sum((x->'acceptance'->>'pending')::int),0) pending,coalesce(sum((x->'homework'->>'total')::int),0) tasks,
   coalesce(sum((x->'homework'->>'done')::int),0) done,coalesce(sum((x->'homework'->>'units')::int),0) units,coalesce(sum((x->'homework'->>'targets')::int),0) targets,
   coalesce(sum((x->'study'->>'duration_ms')::bigint),0) study_ms,coalesce(sum((x->>'partial_exams')::int),0) partial_exams from items
 ) select jsonb_build_object('students',students,'summary',(select to_jsonb(t)||jsonb_build_object('completion_percent',round(done*100.0/nullif(tasks,0)),'repeat_percent',round(units*100.0/nullif(targets,0)),'acceptance_percent',round(accepted*100.0/nullif(sent,0)),'study_per_student',study_ms/nullif(active_students,0)) from totals t),
  'exams',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('subjects',(select coalesce(jsonb_agg(jsonb_build_object('subject',p.subject,'net',p.net,'participants',p.participants)),'[]') from exam_parts p where p.exam_type=e.exam_type and p.scope=e.scope and p.maximum=e.maximum)) order by e.exam_type,e.scope),'[]') from exam_avg e)) into result;return result;
end $$;

create function ders_workspace_private.analysis(cid uuid,p jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare period jsonb;first_day date;last_day date;raw_start date;raw_end date;chosen jsonb;current_data jsonb;previous_data jsonb;prior_start date;prior_end date;result jsonb;
begin
 period:=ders_workspace_private.analysis_period(cid,p);first_day:=(period->>'starts_on')::date;last_day:=(period->>'ends_on')::date;raw_start:=(period->>'requested_start')::date;raw_end:=(period->>'requested_end')::date;
 if p ? 'student_ids' then
  if jsonb_typeof(p->'student_ids') is distinct from 'array' or jsonb_array_length(p->'student_ids') not between 2 and 12 then raise exception 'Karşılaştırma için 2–12 öğrenci seç.' using errcode='22023';end if;
  chosen:=p->'student_ids';if (select count(distinct s) from jsonb_array_elements_text(chosen) s)<2 then raise exception 'İki farklı öğrenci seç.' using errcode='22023';end if;if exists(select 1 from jsonb_array_elements_text(chosen) s where not ders_class_private.is_member(cid,s::uuid) or not ders_workspace_private.allowed(s::uuid)) then raise exception 'Seçilen öğrencilerden birine erişim sona erdi.' using errcode='42501';end if;
 end if;
 current_data:=ders_workspace_private.analysis_snapshot(cid,first_day,last_day,chosen);
 if period->>'mode'<>'all' then
  if period->>'mode'='month' then prior_start:=(raw_start-interval '1 month')::date;prior_end:=raw_start-1;
  elsif period->>'mode'='year' then prior_start:=(raw_start-interval '1 year')::date;prior_end:=raw_start-1;
  else prior_end:=raw_start-1;prior_start:=prior_end-(raw_end-raw_start);end if;
  previous_data:=ders_workspace_private.analysis_snapshot(cid,prior_start,least(prior_end,(now() at time zone 'Europe/Istanbul')::date),chosen)||jsonb_build_object('starts_on',prior_start,'ends_on',prior_end);
 end if;
 result:=jsonb_build_object('class',jsonb_build_object('id',cid,'name',(select name from public.school_classes where id=cid)),'period',period,'current',current_data,'previous',previous_data,
  'methods',jsonb_build_object('progress','Programların gerçek tarihleri seçilen döneme denk gelen, kabul edilmiş ve arşivlenmemiş görevlerin güncel ilerlemesi. Geçmişteki durumun anlık görüntüsü değildir.','study','Güncel üyelik ile onaylı bağlantı dönemlerinin kesişimindeki doğrulanmış Odak kayıtları.','exams','Öğrenci başına dönem içindeki son tam deneme; sınav, kapsam ve azami net ayrı. Kısmi denemeler ortalamaya katılmaz. Veri yoksa net sıfır sayılmaz.'),
  'actions',jsonb_build_object(
   'pending',(select coalesce(jsonb_agg(x),'[]') from (select a.id,a.student_id,u.display_name name,a.week_name from public.teacher_plan_assignments a join public.class_program_recipients r on r.assignment_id=a.id join public.user_profiles u on u.id=a.student_id where r.class_id=cid and a.status='pending' and a.archived_at is null and ders_class_private.is_member(cid,a.student_id) order by a.created_at limit 30) x),
   'changes',(select coalesce(jsonb_agg(x),'[]') from (select cr.id,cr.student_id,u.display_name name,q.title from public.quest_change_requests cr join public.teacher_assigned_quests q on q.id=cr.quest_id join public.class_program_recipients r on r.assignment_id=q.assignment_id join public.user_profiles u on u.id=cr.student_id where r.class_id=cid and cr.teacher_id=auth.uid() and cr.status='pending' and ders_class_private.is_member(cid,cr.student_id) order by cr.created_at limit 30) x),
   'not_started',(select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name')),'[]') from jsonb_array_elements(current_data->'students') s where (s->'homework'->>'total')::int>0 and (s->'homework'->>'units')::int=0),
   'shared_due',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'ends_on',ends_on)),'[]') from public.class_shared_tasks where class_id=cid and status='open' and ends_on between (now() at time zone 'Europe/Istanbul')::date and (now() at time zone 'Europe/Istanbul')::date+7)));
 return result;
end $$;

create function ders_workspace_private.contribution_audit(cid uuid,p jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare period jsonb;result jsonb;off int:=greatest(0,coalesce((p->>'offset')::int,0));sid uuid:=nullif(p->>'student_id','')::uuid;tid uuid:=nullif(p->>'task_id','')::uuid;
begin
 period:=ders_workspace_private.analysis_period(cid,p);if off>100000 then raise exception 'Geçerli sayfa seç.' using errcode='22023';end if;
 if sid is not null and (not ders_workspace_private.allowed(sid) or not ders_class_private.is_member(cid,sid)) then raise exception 'Öğrenciye erişim yok.' using errcode='42501';end if;
 with candidates as materialized (
  select c.*,u.display_name name,t.kind,t.name task_name,t.subject,t.target,t.status task_status,
   (select coalesce(sum(amount),0) from public.class_contributions x where x.task_id=c.task_id) task_total,
   (select coalesce(sum(amount),0) from public.class_contributions x where x.task_id=c.task_id and x.student_id=c.student_id) student_total,
   (select coalesce(sum(amount),0) from public.class_xp_ledger l where l.class_id=cid and l.task_id=c.task_id and l.student_id=c.student_id) earned_class_xp,
   (t.kind='questions' and (c.amount>=500 or (select sum(x.amount) from public.class_contributions x where x.task_id=c.task_id and x.student_id=c.student_id and x.created_at between c.created_at-interval '5 minutes' and c.created_at)>=1000)) review_suggested
  from public.class_contributions c join public.user_profiles u on u.id=c.student_id join public.class_shared_tasks t on t.id=c.task_id
  where c.class_id=cid and c.contribution_date between (period->>'starts_on')::date and (period->>'ends_on')::date and (sid is null or c.student_id=sid) and (tid is null or c.task_id=tid) and ders_workspace_private.allowed(c.student_id)
  order by c.created_at desc,c.id limit 21 offset off
 ), page as (select * from candidates order by created_at desc,id limit 20)
 select jsonb_build_object('period',period,'items',coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('student_percent',round(c.student_total*100.0/nullif(c.task_total,0),1),
  'corrections',(select coalesce(jsonb_agg(jsonb_build_object('date',e.created_at,'previous_amount',e.context->'previous_amount','amount',e.context->'new_amount','reason',e.context->>'reason') order by e.created_at),'[]') from public.class_events e where e.class_id=cid and e.action='correct_contribution' and e.context->>'id'=c.id::text)) order by c.created_at desc,c.id),'[]'),'offset',off,'has_more',(select count(*)>20 from candidates),'method','Soru katkıları beyana dayalıdır. İnceleme işareti yaptırım veya hile tespiti değildir. Net süre doğrulanmış Odak kaydından gelir; ödül düzeltmeleri mevcut ledger içinde korunur.') into result from page c;
 return result;
end $$;

alter function ders_workspace_private.action(text,jsonb) rename to action_m4;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if p_action='analysis' then return ders_workspace_private.analysis((p->>'class_id')::uuid,p);end if;
 if p_action='contribution_audit' then return ders_workspace_private.contribution_audit((p->>'class_id')::uuid,p);end if;
 return ders_workspace_private.action_m4(p_action,p);
end $$;
revoke all on function ders_workspace_private.analysis_period(uuid,jsonb),ders_workspace_private.student_analysis(uuid,uuid,date,date),ders_workspace_private.analysis_snapshot(uuid,date,date,jsonb),ders_workspace_private.analysis(uuid,jsonb),ders_workspace_private.contribution_audit(uuid,jsonb),ders_workspace_private.action_m4(text,jsonb) from public,anon,authenticated;
revoke all on function ders_workspace_private.action(text,jsonb) from public,anon;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';
