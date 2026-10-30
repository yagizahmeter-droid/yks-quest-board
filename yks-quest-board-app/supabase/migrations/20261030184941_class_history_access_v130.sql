begin;
-- Leaving a class preserves the individual teacher connection. Keep authorized history
-- available to that teacher, while a revoked connection still blocks personal progress.
do $history$
declare definition text;before_sql text;after_sql text;
begin
 definition:=pg_get_functiondef('ders_class_private.detail(uuid,jsonb)'::regprocedure);
 before_sql:='where r.program_id=cp.id and (teacher and ders_class_private.is_member(cid,r.student_id) or r.student_id=uid)';
 after_sql:='where r.program_id=cp.id and (teacher and exists(select 1 from public.student_teacher_connections conn where conn.teacher_id=c.teacher_id and conn.student_id=r.student_id and conn.status=''approved'') or r.student_id=uid)';
 if position(before_sql in definition)=0 then raise exception 'Sınıf geçmişi beklenen sürüm değil.';end if;
 definition:=replace(definition,before_sql,after_sql);
 definition:=replace(definition,'''connected'',ders_class_private.is_member(cid,m.student_id),','''connected'',ders_class_private.is_member(cid,m.student_id),''linked'',exists(select 1 from public.student_teacher_connections conn where conn.teacher_id=c.teacher_id and conn.student_id=m.student_id and conn.status=''approved''),');
 definition:=replace(definition,'where s.user_id=m.student_id and ders_class_private.is_member(cid,m.student_id) and','where s.user_id=m.student_id and exists(select 1 from public.student_teacher_connections conn where conn.teacher_id=c.teacher_id and conn.student_id=m.student_id and conn.status=''approved'') and');
 execute definition;
end $history$;
notify pgrst,'reload schema';
commit;
