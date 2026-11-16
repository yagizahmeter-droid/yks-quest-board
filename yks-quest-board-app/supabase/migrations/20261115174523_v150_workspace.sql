-- v1.5.0 workspace storage. Existing assignments, boards and XP stay in their original tables.
create schema ders_workspace_private;
revoke all on schema ders_workspace_private from public,anon;
grant usage on schema ders_workspace_private to authenticated;
create table public.teacher_workspace_drafts(
 id uuid primary key,teacher_id uuid not null references public.user_profiles(id),student_id uuid not null references public.user_profiles(id),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=200000),
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index workspace_drafts_owner_student on public.teacher_workspace_drafts(teacher_id,student_id,updated_at desc,id);
alter table public.teacher_workspace_drafts enable row level security;
revoke all on public.teacher_workspace_drafts from public,anon,authenticated;
grant select on public.teacher_workspace_drafts to authenticated;
create policy workspace_draft_owner on public.teacher_workspace_drafts for select to authenticated using(
 teacher_id=(select auth.uid()) and exists(select 1 from public.user_profiles p where p.id=(select auth.uid()) and p.role='teacher') and exists(select 1 from public.student_teacher_connections c where c.teacher_id=teacher_workspace_drafts.teacher_id and c.student_id=teacher_workspace_drafts.student_id and c.status='approved')
);
create function ders_workspace_private.allowed(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.user_profiles p join public.student_teacher_connections c on c.teacher_id=p.id
  where p.id=auth.uid() and p.role='teacher' and c.student_id=sid and c.status='approved')
$$;
create function ders_workspace_private.date_value(value text) returns date language plpgsql immutable set search_path='' as $$
begin if value is null or value!~'^\d{4}-\d{2}-\d{2}$' then return null;end if;return value::date;exception when invalid_datetime_format or datetime_field_overflow then return null;end $$;
create function ders_workspace_private.week_headers(sid uuid,weeks jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg((w-'quests'-'startDate'-'endDate'-'createdAt')||jsonb_strip_nulls(jsonb_build_object(
  'startDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'startDate',w->>'start')),cp.starts_on),
  'endDate',coalesce(ders_workspace_private.date_value(coalesce(w->>'endDate',w->>'end')),cp.ends_on),
  'createdAt',coalesce(to_jsonb(a.created_at),case when ders_workspace_private.date_value(left(w->>'createdAt',10)) is not null then w->'createdAt' end)))), '[]')
  from jsonb_array_elements(coalesce(weeks,'[]')) w
  left join public.teacher_plan_assignments a on a.week_id=w->>'id' and a.student_id=sid and a.teacher_id=auth.uid()
  left join public.class_program_recipients r on r.assignment_id=a.id left join public.class_programs cp on cp.id=r.program_id
  where ders_workspace_private.allowed(sid)
$$;
create function ders_workspace_private.action(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();sid uuid:=(p->>'student_id')::uuid;did uuid:=(p->>'id')::uuid;item public.teacher_workspace_drafts%rowtype;result jsonb;data jsonb;draft_body jsonb;headers jsonb;wid text;
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='teacher') then raise exception 'Öğretmen hesabıyla giriş gerekli.' using errcode='42501';end if;
 if p_action='students' then return coalesce((select jsonb_agg(jsonb_build_object('id',c.student_id,'name',u.display_name) order by u.display_name,c.student_id) from public.student_teacher_connections c join public.user_profiles u on u.id=c.student_id where c.teacher_id=uid and c.status='approved'),'[]');end if;
 if not ders_workspace_private.allowed(sid) then raise exception 'Bu öğrenciyle onaylı bağlantı gerekli.' using errcode='42501';end if;
 if p_action='student' then
  data:=public.ders_action('student_board',jsonb_build_object('student_id',sid));
  headers:=ders_workspace_private.week_headers(sid,data->'state'->'weeks');
  select w->>'id' into wid from jsonb_array_elements(headers) w
   order by (w->>'id'=p->>'week_id') desc nulls last,coalesce(ders_workspace_private.date_value(w->>'startDate'),ders_workspace_private.date_value(left(w->>'createdAt',10))) desc nulls last,w->>'createdAt' desc nulls last,w->>'id' limit 1;
  return jsonb_build_object('student_id',sid,'name',(select display_name from public.user_profiles where id=sid),'categories',coalesce(data->'state'->'categories','[]'),
   'weeks',headers,
   'week',(select w||(select h from jsonb_array_elements(headers) h where h->>'id'=wid limit 1) from jsonb_array_elements(coalesce(data->'state'->'weeks','[]')) w where w->>'id'=wid limit 1),
   'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'week_id',a.week_id,'week_name',a.week_name,'week_range',a.week_range,'status',a.status,'archived_at',a.archived_at) order by a.created_at desc),'[]') from public.teacher_plan_assignments a where a.teacher_id=uid and a.student_id=sid),
   'xpBreakdown',data->'xpBreakdown');
 elsif p_action='drafts' then return coalesce((select jsonb_agg(d order by d.updated_at desc) from public.teacher_workspace_drafts d where d.teacher_id=uid and d.student_id=sid),'[]');
 elsif p_action='save_draft' then
  if did is null or jsonb_typeof(p->'body') is distinct from 'object' or jsonb_typeof(p->'body'->'quests') is distinct from 'array' or jsonb_array_length(p->'body'->'quests')>200 or octet_length((p->'body')::text)>200000 then raise exception 'Taslak en fazla 200 görev içerebilir.' using errcode='22023';end if;
  draft_body:=jsonb_build_object('name',left(coalesce(p->'body'->>'name',''),200),'start',p->'body'->>'start','end',p->'body'->>'end','quests',p->'body'->'quests');
  perform pg_advisory_xact_lock(hashtextextended(did::text,150));select * into item from public.teacher_workspace_drafts where id=did for update;
  if found then
   if item.teacher_id<>uid or item.student_id<>sid then raise exception 'Taslağa erişim yok.' using errcode='42501';end if;
   if item.body=draft_body then return to_jsonb(item);end if;
   if item.revision is distinct from (p->>'revision')::integer then return jsonb_build_object('error','Bu taslak başka bir cihazda değişti. Açık metnin korundu; güncel kopyayı ayrı taslak olarak açabilirsin.','code','draft_conflict','current_revision',item.revision);end if;
   update public.teacher_workspace_drafts set body=draft_body,revision=revision+1,updated_at=now() where id=did returning * into item;
  else
   if coalesce((p->>'revision')::integer,0)<>0 then raise exception 'Taslak bulunamadı. Açık taslağı yeni kopya olarak kaydet.';end if;
   insert into public.teacher_workspace_drafts(id,teacher_id,student_id,body) values(did,uid,sid,draft_body) returning * into item;
  end if;
  return to_jsonb(item);
 elsif p_action='delete_draft' then
  select * into item from public.teacher_workspace_drafts where id=did and teacher_id=uid and student_id=sid for update;
  if not found then return jsonb_build_object('ok',true,'idempotent',true);end if;
  if item.revision is distinct from (p->>'revision')::integer then return jsonb_build_object('error','Taslak başka bir cihazda değişti. Silinmedi.','code','draft_conflict');end if;
  delete from public.teacher_workspace_drafts where id=did;return jsonb_build_object('ok',true);
 end if;
 raise exception 'Desteklenmeyen çalışma alanı işlemi.' using errcode='22023';
end $$;
revoke all on function ders_workspace_private.allowed(uuid),ders_workspace_private.date_value(text),ders_workspace_private.week_headers(uuid,jsonb),ders_workspace_private.action(text,jsonb) from public,anon,authenticated;
grant execute on function ders_workspace_private.action(text,jsonb) to authenticated;
create function public.ders_workspace(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ders_workspace_private.action(p_action,p_payload)$$;
revoke all on function public.ders_workspace(text,jsonb) from public,anon;
grant execute on function public.ders_workspace(text,jsonb) to authenticated;
notify pgrst,'reload schema';
