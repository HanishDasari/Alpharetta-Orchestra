-- Permission check for Presentations. Same approach as rls_check.sql:
-- pretend users, real policies, everything rolled back. All rows PASS.

create temp table if not exists rls_results3 (test text, got text);
truncate rls_results3;
do $$
declare r jsonb := '{}'; n int; rc int;
  ua uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  uw uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  us uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  uf uuid := 'aaaaaaaa-0000-0000-0000-000000000005';
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
      (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@test.invalid', '{"role":"admin"}', '{}', now(), now()),
      (uw, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-web@test.invalid', '{"role":"webmaster"}', '{}', now(), now()),
      (us, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-student@test.invalid', '{"role":"student"}', '{}', now(), now()),
      (uf, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fam@test.invalid', '{}', '{}', now(), now());
    insert into public.presentations (title, shared) values ('Shared deck', true), ('Private deck', false);

    perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
    select count(*) into n from public.presentations; r := r || jsonb_build_object('anon_decks', n);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
    select count(*) into n from public.presentations; r := r || jsonb_build_object('admin_decks', n);
    begin insert into public.presentations (title) values ('New'); r := r || jsonb_build_object('admin_create', 'ok');
    exception when others then r := r || jsonb_build_object('admin_create', sqlstate); end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', uw, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
    select count(*) into n from public.presentations; r := r || jsonb_build_object('web_decks', n);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
    select count(*) into n from public.presentations; r := r || jsonb_build_object('student_decks', n);
    update public.presentations set title = 'x'; get diagnostics rc = row_count; r := r || jsonb_build_object('student_edit', rc);
    begin insert into public.presentations (title) values ('S'); r := r || jsonb_build_object('student_create', 'ok');
    exception when others then r := r || jsonb_build_object('student_create', sqlstate); end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', uf, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
    select count(*) into n from public.presentations; r := r || jsonb_build_object('family_decks', n);
    execute 'reset role';
    raise exception 'rls_test_rollback';
  exception when raise_exception then if sqlerrm <> 'rls_test_rollback' then raise; end if; end;
  insert into rls_results3 select key, value from jsonb_each_text(r);
end $$;
select t.test, t.got, e.want, case when t.got = e.want then 'PASS' else 'FAIL' end as result
from rls_results3 t left join (values ('anon_decks','0'),('admin_decks','2'),('admin_create','ok'),('web_decks','0'),('student_decks','1'),('student_edit','0'),('student_create','42501'),('family_decks','1')) as e(test, want) on e.test = t.test order by result, t.test;
