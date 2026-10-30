begin;
-- Prevent sparse daily/subject buckets and partial-record counts from revealing a peer's activity.
do $privacy$
declare definition text;before_sql text;after_sql text;
begin
 definition:=pg_get_functiondef('ders_class_private.stats(uuid,date,date)'::regprocedure);
 definition:=replace(definition,'::date as day,sum(duration_ms) duration_ms from time_rows','::date as day,sum(duration_ms) duration_ms,count(distinct user_id) participants from time_rows');
 definition:=replace(definition,'category_name subject,sum(duration_ms) duration_ms from time_rows','category_name subject,sum(duration_ms) duration_ms,count(distinct user_id) participants from time_rows');
 execute definition;
 definition:=pg_get_functiondef('ders_class_private.detail(uuid,jsonb)'::regprocedure);
 before_sql:='if (statistics->>''active_members'')::integer<3 then statistics:=jsonb_set(statistics,''{study}'',''null'');end if;';
 after_sql:=$body$
  statistics:=jsonb_set(statistics,'{partial_exams}','null');
  if (statistics->>'active_members')::integer<3 or (select count(distinct s.user_id) from public.study_segments s where ders_class_private.is_member(cid,s.user_id) and (s.started_at at time zone 'Europe/Istanbul')::date between first_day and last_day) between 1 and 2 then
   statistics:=jsonb_set(statistics,'{study}','null');
  else
   statistics:=jsonb_set(statistics,'{study,by_day}',coalesce((select jsonb_agg(x) from jsonb_array_elements(statistics->'study'->'by_day') x where (x->>'participants')::integer>=3),'[]'));
   statistics:=jsonb_set(statistics,'{study,by_subject}',coalesce((select jsonb_agg(x) from jsonb_array_elements(statistics->'study'->'by_subject') x where (x->>'participants')::integer>=3),'[]'));
  end if;
 $body$;
 if position(before_sql in definition)=0 then raise exception 'Sınıf gizlilik tanımı beklenen sürüm değil; işlem durduruldu.';end if;
 execute replace(definition,before_sql,after_sql);
end $privacy$;
notify pgrst,'reload schema';
commit;
