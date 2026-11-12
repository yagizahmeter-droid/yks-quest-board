-- v1.3.2 rollback: application must first be returned to c77d028.
-- No account, task, XP, history, hiding mask or study segment is restored/deleted here.
-- Apply only after checking that no later release depends on these functions/indexes.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
do $restore$
declare saved jsonb;p jsonb;idx text;
begin
 select data into saved from ders_release_private.app_snapshots where version='v1.3.2-pre';
 if saved is null or not(saved ? '_checks') then raise exception 'Verified v1.3.2 backup required';end if;
 for p in select * from jsonb_array_elements(saved->'policies')p where p->>'schemaname'='public' and p->>'tablename'='quest_board_states' and p->>'policyname' in('Users can read their quest board','Users can insert their quest board','Users can update their quest board') loop
  execute format('alter policy %I on public.quest_board_states %s %s',p->>'policyname',case when p->>'qual' is null then '' else 'using ('||(p->>'qual')||')' end,case when p->>'with_check' is null then '' else 'with check ('||(p->>'with_check')||')' end);
 end loop;
 foreach idx in array array['v132_class_contributions_class_id','v132_class_events_actor_id','v132_class_program_recipients_class_id','v132_class_xp_ledger_student_id','v132_class_xp_ledger_task_id'] loop
  if not exists(select 1 from jsonb_array_elements(saved->'indexes')i where i->>'indexname'=idx and i->>'schemaname'='public') then execute format('drop index if exists public.%I',idx);end if;
 end loop;
end $restore$;
drop function if exists public.ders_history(text,jsonb);
drop function if exists ders_control_private.history_v132(text,jsonb);
commit;
