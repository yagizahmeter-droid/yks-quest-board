begin;
alter table public.ders_admin_notes drop constraint ders_admin_notes_kind_check;
alter table public.ders_admin_notes add constraint ders_admin_notes_kind_check
  check (kind in ('bug','suggestion','test'));
commit;
