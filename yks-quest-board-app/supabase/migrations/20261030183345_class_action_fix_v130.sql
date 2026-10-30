begin;
-- Fix a row-variable/table-alias collision in the class program cancellation branch.
do $fix$
declare definition text;before_sql text:='select to_jsonb(a) from public.class_program_recipients r join public.teacher_plan_assignments a on a.id=r.assignment_id where r.class_id=cid and r.program_id=pid and exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=r.student_id and status=''approved'')';
 after_sql text:='select to_jsonb(a) from public.class_program_recipients recipient join public.teacher_plan_assignments a on a.id=recipient.assignment_id where recipient.class_id=cid and recipient.program_id=pid and exists(select 1 from public.student_teacher_connections where teacher_id=uid and student_id=recipient.student_id and status=''approved'')';
begin
 definition:=pg_get_functiondef('ders_class_private.action(text,jsonb)'::regprocedure);
 if position(before_sql in definition)=0 then raise exception 'Sınıf işlem tanımı beklenen sürüm değil; işlem durduruldu.';end if;
 execute replace(definition,before_sql,after_sql);
end $fix$;
notify pgrst,'reload schema';
commit;
