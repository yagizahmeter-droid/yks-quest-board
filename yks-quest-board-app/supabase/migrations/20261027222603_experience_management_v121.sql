begin;
create schema ders_control_private;
revoke all on schema ders_control_private from public,anon,authenticated;
grant usage on schema ders_control_private to authenticated;
alter table public.teacher_plan_assignments add column archived_at timestamptz;
alter table public.teacher_assigned_quests add column archived_at timestamptz;
create table public.study_history_hidden (
 user_id uuid not null references auth.users(id),kind text not null check(kind in('completion','segment')),
 record_id text not null check(length(record_id) between 1 and 200),week_id text,hidden_at timestamptz not null default now(),
 primary key(user_id,kind,record_id)
);
alter table public.study_history_hidden enable row level security;
revoke all on public.study_history_hidden from public,anon,authenticated;
grant select on public.study_history_hidden to authenticated;
create policy history_hidden_read on public.study_history_hidden for select to authenticated
 using(ders_learning_private.can_read(user_id));

create function ders_control_private.history_scope(p_user uuid,p_scope jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with candidates as (
  select 'completion'::text kind,h->>'id' id,h->>'weekId' week_id,h->>'questId' quest_id
  from public.quest_board_states b,jsonb_array_elements(coalesce(b.state->'studyHistory','[]')) h where b.user_id=p_user
  union all select 'segment',s.id,s.week_id,s.quest_id from public.study_segments s where s.user_id=p_user
 ), selected as (
  select distinct kind,id,week_id from candidates c where id is not null and
   case p_scope->>'scope'
    when 'completion' then kind='completion' and id=p_scope->>'record_id'
    when 'segment' then kind='segment' and id=p_scope->>'record_id'
    when 'quest' then quest_id=p_scope->>'quest_id' and week_id=p_scope->>'week_id'
    when 'week' then week_id=p_scope->>'week_id' else false end
   and not exists(select 1 from public.study_history_hidden h where h.user_id=p_user and h.kind=c.kind and h.record_id=c.id)
 ) select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id,'week_id',week_id) order by kind,id),'[]') from selected
$$;
revoke all on function ders_control_private.history_scope(uuid,jsonb) from public,anon,authenticated;

create function ders_control_private.repair_repeats(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,43));
 if exists(select 1 from public.quest_board_states b,jsonb_array_elements(b.state->'weeks') w,jsonb_array_elements(w->'quests') x
  join public.teacher_assigned_quests q on x->>'assignedQuestId'=q.id::text
  join public.teacher_plan_assignments a on a.id=q.assignment_id
  where b.user_id=p_user and a.student_id=p_user and a.status='accepted' and q.repeat_kind<>'none'
   and (x->'done' is distinct from ders_private.repeat_projection(q.id)->'done'
    or x->'completions' is distinct from ders_private.repeat_projection(q.id)->'completions'
    or x->'repeat' is distinct from ders_private.repeat_projection(q.id)->'repeat')) then
  perform ders_private.refresh_repeat_board(p_user);return true;
 end if;
 return false;
end $$;
revoke all on function ders_control_private.repair_repeats(uuid) from public,anon,authenticated;

create function ders_control_private.protect_archive() returns trigger
language plpgsql security definer set search_path='' as $$
declare r record; entry jsonb; previous jsonb; program jsonb;
begin
 for r in select q.id,q.archived_at,q.repeat_kind,a.archived_at assignment_archived,a.week_id from public.teacher_assigned_quests q
  join public.teacher_plan_assignments a on a.id=q.assignment_id where a.student_id=new.user_id and a.status='accepted' loop
  select x into entry from jsonb_array_elements(new.state->'weeks') w,jsonb_array_elements(w->'quests') x where x->>'id'='teacher-quest-'||r.id;
  select w into program from jsonb_array_elements(new.state->'weeks') w where w->>'id'=r.week_id;
  if r.assignment_archived is not null and (program->>'archived' is distinct from 'true' or program->>'teacherArchived' is distinct from 'true') then raise exception 'Kaldırılmış program yeniden etkinleştirilemez.' using errcode='42501';end if;
  if r.archived_at is not null then
   if entry->>'archived' is distinct from 'true' or entry->>'teacherArchived' is distinct from 'true' then raise exception 'Kaldırılmış öğretmen görevi yeniden etkinleştirilemez.' using errcode='42501';end if;
  end if;
  if (r.archived_at is not null or r.assignment_archived is not null) and tg_op='UPDATE' and r.repeat_kind='none' then
    select x into previous from jsonb_array_elements(old.state->'weeks') w,jsonb_array_elements(w->'quests') x where x->>'id'='teacher-quest-'||r.id;
    if entry->'done' is distinct from previous->'done' or entry->'completionId' is distinct from previous->'completionId' then raise exception 'Kaldırılmış görevin tamamlanması değiştirilemez.' using errcode='42501';end if;
  end if;
  if r.archived_at is null and (entry->>'teacherArchived'='true' or entry->>'archived'='true') then
   raise exception 'Öğretmen atamasını yalnızca gönderen öğretmen kaldırabilir.' using errcode='42501';
  end if;
 end loop;
 return new;
end $$;
revoke all on function ders_control_private.protect_archive() from public,anon,authenticated;
create trigger protect_teacher_archive before insert or update on public.quest_board_states
 for each row execute function ders_control_private.protect_archive();

create function ders_control_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();role_name text;items jsonb;signature text;item jsonb;sid uuid;bid jsonb;weeks jsonb;wid text;chosen text;
 a public.teacher_plan_assignments%rowtype;q public.teacher_assigned_quests%rowtype;rid uuid;stamp timestamptz:=clock_timestamp();removed boolean;
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if p_payload ? 'request_user_id' and p_payload->>'request_user_id' is distinct from uid::text then raise exception 'Oturum değişti.' using errcode='42501';end if;
 select role into role_name from public.user_profiles where id=uid;
 if p_action in('preview_history_delete','delete_history') then
  if role_name is distinct from 'student' or coalesce((p_payload->>'student_id')::uuid,uid)<>uid then raise exception 'Yalnızca kendi geçmişini yönetebilirsin.' using errcode='42501';end if;
  if p_payload->>'scope' is null or p_payload->>'scope' not in('completion','segment','quest','week') then raise exception 'Silinecek kayıtları seç.';end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
  perform pg_advisory_xact_lock(hashtextextended(uid::text,113));
  perform 1 from public.quest_board_states where user_id=uid for update;
  items:=ders_control_private.history_scope(uid,p_payload);signature:=md5(items::text);
  if p_action='delete_history' then
   if p_payload->>'signature' is distinct from signature then raise exception 'Geçmiş listesi değişti. Kayıt sayısını yeniden kontrol et.' using errcode='40001';end if;
   for item in select * from jsonb_array_elements(items) loop
    insert into public.study_history_hidden(user_id,kind,record_id,week_id) values(uid,item->>'kind',item->>'id',item->>'week_id') on conflict do nothing;
   end loop;
  end if;
  return jsonb_build_object('count',jsonb_array_length(items),'signature',signature,'xp_preserved',true);
 elsif p_action in('archive_assignment','archive_assigned_quest') then
  if role_name is distinct from 'teacher' then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501';end if;
  if p_action='archive_assigned_quest' then select * into q from public.teacher_assigned_quests where id=(p_payload->>'quest_id')::uuid;rid:=q.assignment_id;
  else rid:=(p_payload->>'assignment_id')::uuid;end if;
  select * into a from public.teacher_plan_assignments where id=rid;
  if a.id is null or a.teacher_id<>uid or not exists(select 1 from public.student_teacher_connections c where c.teacher_id=uid and c.student_id=a.student_id and c.status='approved')
   then raise exception 'Bu atamayı yönetme yetkin yok.' using errcode='42501';end if;
  perform 1 from public.student_teacher_connections c where c.teacher_id=uid and c.student_id=a.student_id and c.status='approved' for share;
  if not found then raise exception 'Öğrenci bağlantısı sona erdi.' using errcode='42501';end if;
  sid:=a.student_id;perform pg_advisory_xact_lock(hashtextextended(sid::text,43));
  select * into a from public.teacher_plan_assignments where id=rid for update;
  if a.status='pending' and p_action='archive_assignment' then
   update public.teacher_plan_assignments set status='withdrawn',responded_at=stamp where id=a.id;
   perform ders_learning_private.notify(sid,'assignment-withdrawn:'||a.id,'program',uid,sid,null,null,a.id);
   return jsonb_build_object('status','withdrawn');
  end if;
  if a.status<>'accepted' then raise exception 'Yalnızca bekleyen veya kabul edilmiş atamalar kaldırılabilir.';end if;
  if a.archived_at is not null then return jsonb_build_object('status','archived');end if;
  select state into bid from public.quest_board_states where user_id=sid for update;wid:=a.week_id;
  if p_action='archive_assignment' then
   update public.teacher_plan_assignments set archived_at=stamp where id=a.id;
   select jsonb_agg(case when w->>'id'=wid then w||jsonb_build_object('archived',true,'teacherArchived',true) else w end order by ordinality) into weeks
    from jsonb_array_elements(bid->'weeks') with ordinality t(w,ordinality);
  else
   select * into q from public.teacher_assigned_quests where id=(p_payload->>'quest_id')::uuid for update;
   if q.archived_at is not null then return jsonb_build_object('status','archived');end if;
   update public.teacher_assigned_quests set archived_at=stamp where id=q.id;
   select jsonb_agg(case when w->>'id'=wid then w||jsonb_build_object('quests',(
    select jsonb_agg(case when x->>'id'='teacher-quest-'||q.id then x||jsonb_build_object('archived',true,'teacherArchived',true) else x end order by n)
    from jsonb_array_elements(w->'quests') with ordinality v(x,n))) else w end order by ordinality) into weeks
    from jsonb_array_elements(bid->'weeks') with ordinality t(w,ordinality);
  end if;
  if bid->>'activeWeekId'=wid and p_action='archive_assignment' then
   select w->>'id' into chosen from jsonb_array_elements(weeks) w where w->>'archived' is distinct from 'true' limit 1;
   if chosen is null then chosen:='week-'||gen_random_uuid();weeks:=weeks||jsonb_build_array(jsonb_build_object('id',chosen,'name','Yeni Hafta','range','','quests','[]'::jsonb));end if;
   bid:=jsonb_set(bid,'{activeWeekId}',to_jsonb(chosen));
  end if;
  update public.quest_board_states set state=jsonb_set(bid,'{weeks}',weeks),updated_at=stamp,version=greatest(version+1,(extract(epoch from stamp)*1000)::bigint) where user_id=sid;
  perform ders_learning_private.notify(sid,case when p_action='archive_assignment' then 'assignment-archived:'||a.id else 'quest-archived:'||q.id end,
    'program',uid,sid,wid,case when p_action='archive_assigned_quest' then 'teacher-quest-'||q.id else null end,a.id);
  return jsonb_build_object('status','archived','xp_preserved',true);
 elsif p_action='repair_repeats' then
  return jsonb_build_object('repaired',ders_control_private.repair_repeats(uid),'xp_preserved',true);
 end if;
 raise exception 'Bilinmeyen yönetim işlemi.';
end $$;
revoke all on function ders_control_private.action(text,jsonb) from public,anon;
grant execute on function ders_control_private.action(text,jsonb) to authenticated;
create function public.ders_control(p_action text,p_payload jsonb default '{}') returns jsonb
 language sql security invoker set search_path='' as $$select ders_control_private.action(p_action,p_payload)$$;
revoke all on function public.ders_control(text,jsonb) from public,anon;
grant execute on function public.ders_control(text,jsonb) to authenticated;

alter function ders_private.action(text,jsonb) rename to action_before_v121;
revoke all on function ders_private.action_before_v121(text,jsonb) from public,anon,authenticated;
create function ders_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid;result jsonb;pending jsonb;resolved jsonb;qid uuid;
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 if p_action='complete_repeat' then
  if exists(select 1 from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id
   where q.id=(p_payload->>'quest_id')::uuid and a.student_id=uid and (q.archived_at is not null or a.archived_at is not null)) then return jsonb_build_object('status','archived');end if;
 elsif p_action in('request_change','resolve_change') then
  qid:=case when p_action='request_change' then (p_payload->>'quest_id')::uuid else (select quest_id from public.quest_change_requests where id=(p_payload->>'id')::uuid) end;
  select a.student_id into sid from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id where q.id=qid and uid in(a.teacher_id,a.student_id);
  if sid is not null then perform pg_advisory_xact_lock(hashtextextended(sid::text,43));end if;
  if exists(select 1 from public.teacher_assigned_quests q join public.teacher_plan_assignments a on a.id=q.assignment_id where q.id=qid and uid in(a.teacher_id,a.student_id) and (q.archived_at is not null or a.archived_at is not null)) then raise exception 'Kaldırılmış atama için değişiklik yapılamaz.';end if;
 end if;
 if p_action in('read_board','sync_board') then perform ders_control_private.repair_repeats(uid);end if;
 result:=ders_private.action_before_v121(p_action,p_payload);
 if p_action='student_board' then
  sid:=(p_payload->>'student_id')::uuid;
  if ders_control_private.repair_repeats(sid) then result:=ders_private.action_before_v121(p_action,p_payload);end if;
 elsif p_action='overview' then
  select coalesce(jsonb_agg(x),'[]') into pending from jsonb_array_elements(result->'requests') x where x->>'status'='pending';
  select coalesce(jsonb_agg(x),'[]') into resolved from jsonb_array_elements(result->'requests') x where x->>'status'<>'pending';
  result:=jsonb_set(result,'{requests}',pending)||jsonb_build_object('request_history',resolved);
  result:=jsonb_set(result,'{capabilities}',coalesce(result->'capabilities','{}')||'{"manageAssignments":true,"historyCleanup":true,"canonicalRepeats":true}'::jsonb);
 elsif p_action='sync_board' and not coalesce((result->>'conflict')::boolean,false) then
  result:=result||jsonb_build_object('state',(select state from public.quest_board_states where user_id=uid));
 end if;
 if p_action in('read_board','student_board') then
  sid:=case when p_action='student_board' then (p_payload->>'student_id')::uuid else uid end;
  result:=result||jsonb_build_object('hidden_history',coalesce((select jsonb_agg(jsonb_build_object('kind',h.kind,'id',h.record_id)) from public.study_history_hidden h where h.user_id=sid),'[]'));
 end if;
 return result;
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;

alter function ders_learning_private.action(text,jsonb) rename to action_before_v121;
revoke all on function ders_learning_private.action_before_v121(text,jsonb) from public,anon,authenticated;
create function ders_learning_private.action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid;result jsonb;
begin
 if uid is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 result:=ders_learning_private.action_before_v121(p_action,p_payload);
 if p_action in('overview','report') then
  sid:=case when p_action='report' then coalesce((p_payload->>'student_id')::uuid,uid) else uid end;
  if not ders_learning_private.can_read(sid) then raise exception 'Çalışma geçmişine erişim yok.' using errcode='42501';end if;
  if p_action='report' and ders_control_private.repair_repeats(sid) then result:=ders_learning_private.action_before_v121(p_action,p_payload);end if;
  result:=result||jsonb_build_object('hidden_history',coalesce((select jsonb_agg(jsonb_build_object('kind',h.kind,'id',h.record_id)) from public.study_history_hidden h where h.user_id=sid),'[]'));
  result:=jsonb_set(result,'{segments}',coalesce((select jsonb_agg(s) from jsonb_array_elements(result->'segments') s where not exists(
   select 1 from public.study_history_hidden h where h.user_id=sid and h.kind='segment' and h.record_id=s->>'id')),'[]'));
 end if;
 return result;
end $$;
revoke all on function ders_learning_private.action(text,jsonb) from public,anon;
grant execute on function ders_learning_private.action(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
