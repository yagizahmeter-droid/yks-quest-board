-- v1.3.2: only additive FK indexes and equivalent Auth init plans.
-- Apply with scripts/v132-migration.cjs after the read-only schema preflight.
do $guard$
declare p record;expected text;
begin
 for p in select * from pg_policies where schemaname='public' and tablename='quest_board_states' and policyname in('Users can read their quest board','Users can insert their quest board','Users can update their quest board') loop
  expected:=case p.policyname when 'Users can read their quest board' then 'SELECT' when 'Users can insert their quest board' then 'INSERT' else 'UPDATE' end;
  if p.cmd<>expected or p.roles<>array['authenticated']::name[] or p.permissive<>'PERMISSIVE' then raise exception 'Unexpected board policy identity; stop v1.3.2';end if;
  if p.qual is not null and p.qual not in('(auth.uid() = user_id)','(( SELECT auth.uid() AS uid) = user_id)') then raise exception 'Unexpected board USING predicate; stop v1.3.2';end if;
  if p.with_check is not null and p.with_check not in('(auth.uid() = user_id)','(( SELECT auth.uid() AS uid) = user_id)') then raise exception 'Unexpected board CHECK predicate; stop v1.3.2';end if;
 end loop;
 if (select count(*) from pg_policies where schemaname='public' and tablename='quest_board_states' and policyname in('Users can read their quest board','Users can insert their quest board','Users can update their quest board'))<>3 then raise exception 'Missing board policy; stop v1.3.2';end if;
end $guard$;
create index if not exists v132_class_contributions_class_id on public.class_contributions(class_id);
create index if not exists v132_class_events_actor_id on public.class_events(actor_id);
create index if not exists v132_class_program_recipients_class_id on public.class_program_recipients(class_id);
create index if not exists v132_class_xp_ledger_student_id on public.class_xp_ledger(student_id);
create index if not exists v132_class_xp_ledger_task_id on public.class_xp_ledger(task_id);
alter policy "Users can read their quest board" on public.quest_board_states using((select auth.uid())=user_id);
alter policy "Users can insert their quest board" on public.quest_board_states with check((select auth.uid())=user_id);
alter policy "Users can update their quest board" on public.quest_board_states using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
