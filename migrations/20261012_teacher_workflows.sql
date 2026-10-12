begin;
create schema if not exists ders_private;
revoke all on schema ders_private from public, anon;
grant usage on schema ders_private to authenticated;

create table ders_private.board_backups (
  backup_id uuid primary key default gen_random_uuid(),
  user_id uuid not null, state jsonb not null, updated_at timestamptz not null,
  client_id text, version bigint not null, state_hash text not null,
  backed_up_at timestamptz not null default now()
);
alter table ders_private.board_backups enable row level security;
insert into ders_private.board_backups(user_id,state,updated_at,client_id,version,state_hash)
select user_id,state,updated_at,client_id,version,md5(state::text) from public.quest_board_states;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('student','teacher')),
  display_name text not null check(length(display_name) between 1 and 100),
  created_at timestamptz not null default now()
);
create table ders_private.teacher_invite_codes (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.user_profiles(id),
  code_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days',
  active boolean not null default true, created_at timestamptz not null default now()
);
create table ders_private.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade, attempted_at timestamptz not null default now()
);
create table public.student_teacher_connections (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.user_profiles(id),
  student_id uuid not null references public.user_profiles(id),
  status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
  created_at timestamptz not null default now(), approved_at timestamptz,
  unique(teacher_id,student_id), check(teacher_id<>student_id)
);
create table public.teacher_plan_assignments (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.user_profiles(id),
  student_id uuid not null references public.user_profiles(id), week_name text not null, week_range text not null default '',
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  week_id text, created_at timestamptz not null default now(), responded_at timestamptz
);
create table public.teacher_assigned_quests (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.teacher_plan_assignments(id),
  category_name text not null, title text not null, detail text not null default '',
  xp integer not null check(xp between 5 and 10000), sort_order integer not null default 0
);
create table public.quest_change_requests (
  id uuid primary key default gen_random_uuid(), quest_id uuid not null references public.teacher_assigned_quests(id),
  student_id uuid not null references public.user_profiles(id), teacher_id uuid not null references public.user_profiles(id),
  requested_changes jsonb not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create index on public.student_teacher_connections(student_id,status);
create index on public.student_teacher_connections(teacher_id,status);
create index on public.teacher_plan_assignments(student_id,status);
create index on public.teacher_plan_assignments(teacher_id,status);
create index on public.teacher_assigned_quests(assignment_id);
create index on public.quest_change_requests(student_id,status);
create index on public.quest_change_requests(teacher_id,status);
create index on public.quest_change_requests(quest_id);
create index on ders_private.invite_attempts(user_id,attempted_at);
create index on ders_private.teacher_invite_codes(teacher_id);

alter table public.user_profiles enable row level security;
alter table public.student_teacher_connections enable row level security;
alter table public.teacher_plan_assignments enable row level security;
alter table public.teacher_assigned_quests enable row level security;
alter table public.quest_change_requests enable row level security;
alter table ders_private.teacher_invite_codes enable row level security;
alter table ders_private.invite_attempts enable row level security;
revoke all on public.user_profiles, public.student_teacher_connections, public.teacher_plan_assignments,
  public.teacher_assigned_quests, public.quest_change_requests from public, anon, authenticated;
grant select on public.user_profiles, public.student_teacher_connections, public.teacher_plan_assignments,
  public.teacher_assigned_quests, public.quest_change_requests to authenticated;
create policy profile_owner on public.user_profiles for select to authenticated using(id=(select auth.uid()));
create policy connection_participant on public.student_teacher_connections for select to authenticated
using((select auth.uid()) in (teacher_id,student_id));
create policy assignment_participant on public.teacher_plan_assignments for select to authenticated
using(student_id=(select auth.uid()) or (teacher_id=(select auth.uid()) and exists(
 select 1 from public.student_teacher_connections c where c.teacher_id=teacher_plan_assignments.teacher_id
 and c.student_id=teacher_plan_assignments.student_id and c.status='approved')));
create policy assigned_quest_participant on public.teacher_assigned_quests for select to authenticated
using(exists(select 1 from public.teacher_plan_assignments a where a.id=assignment_id));
create policy request_participant on public.quest_change_requests for select to authenticated
using(student_id=(select auth.uid()) or (teacher_id=(select auth.uid()) and exists(
 select 1 from public.student_teacher_connections c where c.teacher_id=quest_change_requests.teacher_id
 and c.student_id=quest_change_requests.student_id and c.status='approved')));

-- Private atomic operations own cross-user writes. Every action verifies the caller and current connection.
create function ders_private.action(p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role_name text; result jsonb; item jsonb; board jsonb; v bigint;
 cid uuid; sid uuid; tid uuid; aid uuid; qid uuid; code text; catid text; wid text;
 a public.teacher_plan_assignments%rowtype; c public.student_teacher_connections%rowtype;
 q public.teacher_assigned_quests%rowtype; cr public.quest_change_requests%rowtype;
 changes jsonb; newquests jsonb:='[]'; cats jsonb; weeks jsonb; n integer:=0;
begin
 if uid is null then raise exception 'Giriş yapmalısın.' using errcode='42501'; end if;
 select role into role_name from public.user_profiles where id=uid;
 if p_action='init_profile' then
   if role_name is null then
     if p_payload->>'role' not in ('student','teacher') or coalesce(length(trim(p_payload->>'name')),0) not between 1 and 100
     then raise exception 'Adını ve hesap türünü seç.'; end if;
     insert into public.user_profiles(id,role,display_name) values(uid,p_payload->>'role',trim(p_payload->>'name')) on conflict do nothing;
   end if;
   return (select to_jsonb(p) from public.user_profiles p where id=uid);
 end if;
 if p_action='sync_board' then
   select state,version into board,v from public.quest_board_states where user_id=uid for update;
   if found and v<>coalesce((p_payload->>'expected_version')::bigint,0) then
     return jsonb_build_object('conflict',true,'state',board,'version',v);
   end if;
   if jsonb_typeof(p_payload->'state'->'weeks') is distinct from 'array' then raise exception 'Geçersiz board.'; end if;
   if jsonb_array_length(p_payload->'state'->'weeks')=0 then raise exception 'Geçersiz board.'; end if;
   v:=greatest(coalesce(v,0)+1,(extract(epoch from clock_timestamp())*1000)::bigint);
   insert into public.quest_board_states(user_id,state,updated_at,client_id,version)
   values(uid,p_payload->'state',clock_timestamp(),p_payload->>'client_id',v)
   on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at,client_id=excluded.client_id,version=excluded.version;
   return jsonb_build_object('version',v);
 end if;
 if p_action='overview' then
   return jsonb_build_object('profile',(select to_jsonb(p) from public.user_profiles p where id=uid),
   'connections',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select conn.*,p.display_name as name from public.student_teacher_connections conn
     join public.user_profiles p on p.id=case when conn.teacher_id=uid then conn.student_id else conn.teacher_id end
     where uid in(conn.teacher_id,conn.student_id) order by conn.created_at desc) x),'[]'),
   'assignments',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select assigned.*,p.display_name as name,(select jsonb_agg(to_jsonb(task) order by task.sort_order) from public.teacher_assigned_quests task where assignment_id=assigned.id) quests
     from public.teacher_plan_assignments assigned join public.user_profiles p on p.id=case when assigned.teacher_id=uid then assigned.student_id else assigned.teacher_id end
     where assigned.student_id=uid or (assigned.teacher_id=uid and exists(select 1 from public.student_teacher_connections conn
       where conn.teacher_id=uid and conn.student_id=assigned.student_id and conn.status='approved')) order by assigned.created_at desc) x),'[]'),
   'requests',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select r.*,task.title,p.display_name as name from public.quest_change_requests r join public.teacher_assigned_quests task on task.id=r.quest_id
     join public.user_profiles p on p.id=r.student_id
     where r.student_id=uid or (r.teacher_id=uid and exists(select 1 from public.student_teacher_connections conn
       where conn.teacher_id=uid and conn.student_id=r.student_id and conn.status='approved')) order by r.created_at desc) x),'[]'));
 end if;
 if role_name is null then raise exception 'Önce hesap türünü seç.'; end if;
 if p_action='create_invite' then
   if role_name<>'teacher' then raise exception 'Öğretmen hesabı gerekli.' using errcode='42501'; end if;
   update ders_private.teacher_invite_codes set active=false where teacher_id=uid;
   code:=upper(encode(extensions.gen_random_bytes(12),'hex'));
   insert into ders_private.teacher_invite_codes(teacher_id,code_hash) values(uid,encode(extensions.digest(code,'sha256'),'hex'));
   return jsonb_build_object('code',code,'expires_at',now()+interval '7 days');
 elsif p_action='request_connection' then
   if role_name<>'student' then raise exception 'Öğrenci hesabı gerekli.'; end if;
   if (select count(*) from ders_private.invite_attempts where user_id=uid and attempted_at>now()-interval '10 minutes')>=20
   then return jsonb_build_object('error','Çok fazla deneme. 10 dakika sonra tekrar dene.'); end if;
   insert into ders_private.invite_attempts(user_id) values(uid);
   select teacher_id into tid from ders_private.teacher_invite_codes where active and expires_at>now()
   and code_hash=encode(extensions.digest(upper(trim(p_payload->>'code')),'sha256'),'hex');
   if tid is null then return jsonb_build_object('error','Davet kodu geçersiz veya süresi dolmuş.'); end if;
   insert into public.student_teacher_connections(teacher_id,student_id) values(tid,uid)
   on conflict(teacher_id,student_id) do update set status='pending',approved_at=null,created_at=now()
     where student_teacher_connections.status in('rejected','revoked');
 elsif p_action in ('respond_connection','remove_connection') then
   select * into c from public.student_teacher_connections where id=(p_payload->>'id')::uuid for update;
   if not found or uid not in(c.teacher_id,c.student_id) then raise exception 'Bağlantı bulunamadı.' using errcode='42501'; end if;
   if p_action='remove_connection' then
     update public.student_teacher_connections set status='revoked',approved_at=null where id=c.id;
     update public.teacher_plan_assignments set status='rejected',responded_at=now() where teacher_id=c.teacher_id and student_id=c.student_id and status='pending';
   else
     if uid<>c.teacher_id or role_name<>'teacher' or c.status<>'pending' or p_payload->>'status' not in('approved','rejected') then raise exception 'Bu isteğe yanıt veremezsin.' using errcode='42501'; end if;
     update public.student_teacher_connections set status=p_payload->>'status',approved_at=case when p_payload->>'status'='approved' then now() else null end where id=c.id;
   end if;
 elsif p_action in ('assign_program','student_board') then
   sid:=(p_payload->>'student_id')::uuid;
   if role_name<>'teacher' or not exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=sid and status='approved')
   then raise exception 'Bu öğrenciye erişim yetkin yok.' using errcode='42501'; end if;
   if p_action='student_board' then
     return jsonb_build_object('state',(select state from public.quest_board_states where user_id=sid),'name',(select display_name from public.user_profiles where id=sid));
   end if;
   if coalesce(length(trim(p_payload->>'week_name')),0) not between 1 and 200 or jsonb_typeof(p_payload->'quests')<>'array'
     or jsonb_array_length(p_payload->'quests') not between 1 and 200 then raise exception 'Hafta adı ve en az bir quest gerekli.'; end if;
   insert into public.teacher_plan_assignments(teacher_id,student_id,week_name,week_range)
   values(uid,sid,trim(p_payload->>'week_name'),left(coalesce(p_payload->>'week_range',''),200)) returning id into aid;
   for item in select value from jsonb_array_elements(p_payload->'quests') loop
     if coalesce(length(trim(item->>'title')),0) not between 1 and 200 or coalesce(length(trim(item->>'category')),0) not between 1 and 100
       or coalesce((item->>'xp')::int,0) not between 5 and 10000 then raise exception 'Quest adı, kategori ve 5–10000 XP gerekli.'; end if;
     insert into public.teacher_assigned_quests(assignment_id,category_name,title,detail,xp,sort_order)
     values(aid,trim(item->>'category'),trim(item->>'title'),left(coalesce(item->>'detail',''),2000),(item->>'xp')::int,n);
     n:=n+1;
   end loop;
 elsif p_action='respond_assignment' then
   select * into a from public.teacher_plan_assignments where id=(p_payload->>'id')::uuid for update;
   if not found or a.student_id<>uid or a.status<>'pending' or p_payload->>'status' not in('accepted','rejected')
     or not exists(select 1 from public.student_teacher_connections where teacher_id=a.teacher_id and student_id=uid and status='approved')
   then raise exception 'Bu programa yanıt veremezsin.' using errcode='42501'; end if;
   if p_payload->>'status'='accepted' then
     wid:='teacher-week-'||a.id;
     select state into board from public.quest_board_states where user_id=uid for update;
     board:=coalesce(board,jsonb_build_object('weeks','[]'::jsonb,'categories','[]'::jsonb,'studyHistory','[]'::jsonb));
     cats:=coalesce(board->'categories','[]');
     for q in select * from public.teacher_assigned_quests where assignment_id=a.id order by sort_order loop
       catid:='teacher-cat-'||a.id||'-'||md5(q.category_name);
       if not exists(select 1 from jsonb_array_elements(cats) x where x->>'id'=catid) then
         cats:=cats||jsonb_build_array(jsonb_build_object('id',catid,'key',catid,'name',q.category_name,'color','#63d6d6','sortOrder',jsonb_array_length(cats)*10));
       end if;
       newquests:=newquests||jsonb_build_array(jsonb_build_object('id','teacher-quest-'||q.id,'categoryId',catid,'subject',catid,
         'title',q.title,'detail',q.detail,'xp',q.xp,'done',false,'sortOrder',q.sort_order,'source','teacher_assigned',
         'sourceDay','Öğretmen atadı','lockedForStudent',true,'assignedQuestId',q.id,'assignedByTeacherId',a.teacher_id));
     end loop;
     board:=jsonb_set(board,'{weeks}',coalesce(board->'weeks','[]')||jsonb_build_array(jsonb_build_object('id',wid,'name',a.week_name,'range',a.week_range,'quests',newquests)));
     board:=jsonb_set(board,'{categories}',cats);
     board:=jsonb_set(board,'{activeWeekId}',to_jsonb(wid));
     update public.teacher_plan_assignments set status='accepted',week_id=wid,responded_at=now() where id=a.id;
     insert into public.quest_board_states(user_id,state,updated_at,version) values(uid,board,clock_timestamp(),(extract(epoch from clock_timestamp())*1000)::bigint)
       on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at,version=greatest(quest_board_states.version+1,excluded.version);
   else update public.teacher_plan_assignments set status='rejected',responded_at=now() where id=a.id; end if;
 elsif p_action='request_change' then
   select * into q from public.teacher_assigned_quests where id=(p_payload->>'quest_id')::uuid;
   select * into a from public.teacher_plan_assignments where id=q.assignment_id;
   if a.student_id is distinct from uid or a.status<>'accepted' or not exists(select 1 from public.student_teacher_connections where teacher_id=a.teacher_id and student_id=uid and status='approved')
   then raise exception 'Bu görev için değişiklik isteyemezsin.' using errcode='42501'; end if;
   changes:=p_payload->'changes';
   if coalesce(length(trim(changes->>'title')),0) not between 1 and 200 or coalesce((changes->>'xp')::int,0) not between 5 and 10000
     or coalesce(length(changes->>'detail'),0)>2000 then raise exception 'Geçersiz görev değişikliği.'; end if;
   if exists(select 1 from public.quest_change_requests where quest_id=q.id and status='pending') then raise exception 'Bu görev için zaten bekleyen istek var.'; end if;
   insert into public.quest_change_requests(quest_id,student_id,teacher_id,requested_changes) values(q.id,uid,a.teacher_id,changes);
 elsif p_action='resolve_change' then
   select * into cr from public.quest_change_requests where id=(p_payload->>'id')::uuid for update;
   if not found or cr.teacher_id<>uid or role_name<>'teacher' or cr.status<>'pending' or p_payload->>'status' not in('approved','rejected')
     or not exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=cr.student_id and status='approved')
   then raise exception 'Bu değişikliği yanıtlayamazsın.' using errcode='42501'; end if;
   if p_payload->>'status'='approved' then
     update public.teacher_assigned_quests set title=cr.requested_changes->>'title',detail=coalesce(cr.requested_changes->>'detail',''),xp=(cr.requested_changes->>'xp')::int where id=cr.quest_id;
     select state into board from public.quest_board_states where user_id=cr.student_id for update;
     select jsonb_agg(jsonb_set(w,'{quests}',coalesce((select jsonb_agg(case when x->>'id'='teacher-quest-'||cr.quest_id then
       x||jsonb_build_object('title',cr.requested_changes->>'title','detail',coalesce(cr.requested_changes->>'detail',''),'xp',(cr.requested_changes->>'xp')::int) else x end)
       from jsonb_array_elements(w->'quests') x),'[]'))) into weeks from jsonb_array_elements(board->'weeks') w;
     update public.quest_board_states set state=jsonb_set(board,'{weeks}',weeks),updated_at=clock_timestamp(),version=greatest(version+1,(extract(epoch from clock_timestamp())*1000)::bigint) where user_id=cr.student_id;
   end if;
   update public.quest_change_requests set status=p_payload->>'status',resolved_at=now() where id=cr.id;
 else raise exception 'Bilinmeyen işlem.'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function ders_private.action(text,jsonb) from public,anon;
grant execute on function ders_private.action(text,jsonb) to authenticated;
create function public.ders_action(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_private.action(p_action,p_payload); $$;
revoke all on function public.ders_action(text,jsonb) from public,anon;
grant execute on function public.ders_action(text,jsonb) to authenticated;

create function ders_private.protect_teacher_quests() returns trigger
language plpgsql security definer set search_path='' as $$
declare q record; entry jsonb; amount integer;
begin
 for q in select t.*,a.week_id,a.teacher_id from public.teacher_assigned_quests t join public.teacher_plan_assignments a on a.id=t.assignment_id
   where a.student_id=new.user_id and a.status='accepted' loop
   select count(*),jsonb_agg(x)->0 into amount,entry from jsonb_array_elements(new.state->'weeks') w,
     jsonb_array_elements(w->'quests') x where x->>'id'='teacher-quest-'||q.id;
   if amount<>1 or entry->>'title' is distinct from q.title or entry->>'detail' is distinct from q.detail
     or (entry->>'xp')::int is distinct from q.xp or entry->>'source' is distinct from 'teacher_assigned'
     or entry->>'assignedQuestId' is distinct from q.id::text or entry->>'assignedByTeacherId' is distinct from q.teacher_id::text
     or entry->>'lockedForStudent' is distinct from 'true'
     or entry->>'categoryId' is distinct from ('teacher-cat-'||q.assignment_id||'-'||md5(q.category_name))
     or entry->>'subject' is distinct from ('teacher-cat-'||q.assignment_id||'-'||md5(q.category_name))
     or not exists(select 1 from jsonb_array_elements(new.state->'weeks') w,jsonb_array_elements(w->'quests') x
       where w->>'id'=q.week_id and x->>'id'='teacher-quest-'||q.id)
   then raise exception 'Öğretmen görevi doğrudan değiştirilemez. Boardu eşitle veya değişiklik isteği gönder.' using errcode='42501'; end if;
 end loop;
 return new;
end $$;
revoke all on function ders_private.protect_teacher_quests() from public,anon,authenticated;
create trigger protect_teacher_quests before insert or update on public.quest_board_states
for each row execute function ders_private.protect_teacher_quests();

do $$ begin
 if (select count(*) from ders_private.board_backups)<>(select count(*) from public.quest_board_states)
 then raise exception 'Board sayısı değişti; migration geri alındı.'; end if;
 if exists(select 1 from ders_private.board_backups b join public.quest_board_states s using(user_id)
   where b.state_hash<>md5(s.state::text) or b.version<>s.version) then raise exception 'Board doğrulaması başarısız; migration geri alındı.'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='rls_auto_enable')
 then revoke execute on function public.rls_auto_enable() from public,anon,authenticated; end if;
end $$;
notify pgrst,'reload schema';
commit;
