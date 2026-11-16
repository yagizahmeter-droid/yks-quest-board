-- STAGING TEST HARNESS ONLY. Not a production migration or public asset.
-- Fixtures run in an exception subtransaction and are rolled back before returning metrics.
create function ders_release_private.v150_benchmark(teacher uuid,size integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ids uuid[];cid uuid:=gen_random_uuid();pid uuid;week integer;iteration integer;payload jsonb;data jsonb;started timestamptz;
 old_times numeric[]:='{}';new_times numeric[]:='{}';old_bytes integer;new_bytes integer;result jsonb;before_rows jsonb;plan jsonb;today date:=(now() at time zone 'Europe/Istanbul')::date;old_uid text:=current_setting('request.jwt.claim.sub',true);
begin
 if size not in(10,30,50,100) or not exists(select 1 from auth.users u join public.user_profiles p on p.id=u.id where u.id=teacher and u.email like '%@example.com' and p.role='teacher') then raise exception 'Isolated synthetic teacher and supported fixture size required.';end if;
 before_rows:=ders_release_private.v150_fingerprint();
 begin
  select array_agg(gen_random_uuid()) into ids from generate_series(1,size);
  insert into auth.users(id,email,aud,role,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
   select id,'v150-perf-'||id::text||'@example.com','authenticated','authenticated',now(),now(),'{"provider":"email","providers":["email"]}','{}' from unnest(ids) id;
  insert into public.user_profiles(id,role,display_name) select id,'student','Synthetic '||left(id::text,6) from unnest(ids) id;
  insert into public.school_classes(id,teacher_id,name,created_at) values(cid,teacher,'STAGING ROLLED BACK PERFORMANCE TEST',now()-interval '190 days');
  insert into public.student_teacher_connections(teacher_id,student_id,status,created_at,approved_at) select teacher,id,'approved',now()-interval '190 days',now()-interval '190 days' from unnest(ids) id;
  insert into public.class_memberships(class_id,student_id,status,joined_at) select cid,id,'active',now()-interval '180 days' from unnest(ids) id;
  for week in 0..25 loop
   pid:=gen_random_uuid();insert into public.class_programs(id,class_id,name,starts_on,ends_on) values(pid,cid,'Synthetic week '||week,today-week*7,today-week*7+6);
   with created as (insert into public.teacher_plan_assignments(id,teacher_id,student_id,week_name,week_range,status)
    select gen_random_uuid(),teacher,id,'Synthetic week '||week,'',case when (n-1)%4=0 then 'pending' else 'accepted' end from unnest(ids) with ordinality u(id,n) returning id,student_id)
    insert into public.class_program_recipients(program_id,class_id,student_id,assignment_id) select pid,cid,student_id,id from created;
   insert into public.teacher_assigned_quests(assignment_id,category_name,title,detail,xp,sort_order,repeat_kind,repeat_target)
    select r.assignment_id,'Matematik','Synthetic '||n,'Rolled back fixture',100,n,'weekly',5 from public.class_program_recipients r cross join generate_series(1,10) n where r.program_id=pid;
  end loop;
  perform set_config('request.jwt.claim.sub',teacher::text,true);
  payload:=jsonb_build_object('class_id',cid,'period','week','week_start',today);
  for iteration in 1..3 loop
   started:=clock_timestamp();data:=public.ders_classes('detail',payload);old_times:=array_append(old_times,extract(epoch from clock_timestamp()-started)*1000);old_bytes:=octet_length(data::text);
   started:=clock_timestamp();data:=public.ders_classes('detail',payload||jsonb_build_object('view_version',2,'section','summary'));new_times:=array_append(new_times,extract(epoch from clock_timestamp()-started)*1000);new_bytes:=octet_length(data::text);
  end loop;
  execute 'explain (analyze,buffers,format json) select id from public.class_programs where class_id=$1 order by pinned desc,created_at desc,id limit 20' into plan using cid;
  result:=jsonb_build_object('students',size,'weeks',26,'tasks_per_recipient',10,'before_ms',(select percentile_cont(0.5) within group(order by x) from unnest(old_times) x),'after_ms',(select percentile_cont(0.5) within group(order by x) from unnest(new_times) x),'before_bytes',old_bytes,'after_bytes',new_bytes,'program_plan',plan);
  raise exception using errcode='P1500',message='Rollback synthetic benchmark fixtures';
 exception when sqlstate 'P1500' then null;
 end;
 perform set_config('request.jwt.claim.sub',coalesce(old_uid,''),true);
 if ders_release_private.v150_fingerprint() is distinct from before_rows then raise exception 'Benchmark modified existing rows; abort';end if;
 return result||jsonb_build_object('fixtures_rolled_back',true,'existing_rows_unchanged',true,'scope','staging server SQL; three warm iterations, no HTTP latency');
end $$;
revoke all on function ders_release_private.v150_benchmark(uuid,integer) from public,anon,authenticated;
