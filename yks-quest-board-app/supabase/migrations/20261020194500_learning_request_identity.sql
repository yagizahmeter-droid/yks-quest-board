begin;
-- Bind in-flight browser requests to the account that initiated them, even if
-- the SDK changes its access token while another tab signs into a new account.
create or replace function public.ders_learning(p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_payload ? 'request_user_id' and p_payload->>'request_user_id' is distinct from auth.uid()::text then
  raise exception 'Oturum değişti. İşlemi kendi hesabında yeniden dene.' using errcode='42501';
 end if;
 return ders_learning_private.action(p_action,p_payload);
end $$;
revoke all on function public.ders_learning(text,jsonb) from public,anon;
grant execute on function public.ders_learning(text,jsonb) to authenticated;
commit;
