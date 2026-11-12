-- No history, task, segment or XP row is removed by this RPC. Only own hiding masks.
create function ders_control_private.history_v132(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $body$
declare uid uuid:=auth.uid();records jsonb;item jsonb;n integer;changed integer;
begin
 if uid is null or not exists(select 1 from public.user_profiles where id=uid and role='student') then raise exception 'Öğrenci hesabıyla giriş gerekli.' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload ? 'student_id' or p_payload ? 'user_id' or (p_payload ? 'request_user_id' and p_payload->>'request_user_id' is distinct from uid::text) then raise exception 'Yalnızca kendi geçmişini yönetebilirsin.' using errcode='42501';end if;
 if p_action='list_hidden' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.hidden_at desc,x.kind,x.id),'[]') into records from (
   select h.kind,h.record_id id,h.week_id,h.hidden_at,
    case when h.kind='segment' then coalesce(s.category_name,'Çalışma süresi') else coalesce(c.record->>'title','Görev kaydı') end label,
    coalesce(w.record->>'customTitle',w.record->>'name','Eski hafta') week_name
   from public.study_history_hidden h
   left join public.study_segments s on h.kind='segment' and s.user_id=uid and s.id=h.record_id
   left join public.quest_board_states b on b.user_id=uid
   left join lateral(select v record from jsonb_array_elements(coalesce(b.state->'studyHistory','[]')) v where h.kind='completion' and v->>'id'=h.record_id limit 1)c on true
   left join lateral(select v record from jsonb_array_elements(coalesce(b.state->'weeks','[]'))v where v->>'id'=h.week_id limit 1)w on true
   where h.user_id=uid order by h.hidden_at desc,h.kind,h.record_id limit 500
  )x;
  return jsonb_build_object('records',records);
 elsif p_action='restore' then
  records:=p_payload->'records';
  if jsonb_typeof(records) is distinct from 'array' then raise exception 'Geri getirilecek kayıtları seç.';end if;
  n:=jsonb_array_length(records);if n not between 1 and 100 then raise exception 'Bir seferde 1–100 kayıt seç.';end if;
  for item in select * from jsonb_array_elements(records) loop
   if jsonb_typeof(item) is distinct from 'object' or (item->>'kind') is null or item->>'kind' not in('completion','segment') or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 200 or exists(select 1 from jsonb_object_keys(item)k where k not in('kind','id')) then raise exception 'Geçersiz geçmiş kaydı.';end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
  perform pg_advisory_xact_lock(hashtextextended(uid::text,113));
  delete from public.study_history_hidden h where h.user_id=uid and exists(select 1 from jsonb_array_elements(records)i where i->>'kind'=h.kind and i->>'id'=h.record_id);
  get diagnostics changed=row_count;
  return jsonb_build_object('count',changed,'xp_preserved',true);
 else raise exception 'Geçersiz geçmiş işlemi.';end if;
end $body$;
revoke all on function ders_control_private.history_v132(text,jsonb) from public,anon;
grant execute on function ders_control_private.history_v132(text,jsonb) to authenticated;
create function public.ders_history(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select ders_control_private.history_v132(p_action,p_payload) $$;
revoke all on function public.ders_history(text,jsonb) from public,anon;
grant execute on function public.ders_history(text,jsonb) to authenticated;
