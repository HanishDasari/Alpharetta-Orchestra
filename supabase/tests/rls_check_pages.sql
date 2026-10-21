-- Permission check for pages and the menu (site_pages, site_nav).
-- Same approach as rls_check.sql: pretend users, real policies, and
-- everything rolled back. Every row should say PASS.

create temp table if not exists rls_results2 (test text, got text);
truncate rls_results2;

do $$
declare
  r jsonb := '{}';
  n int; rc int;
  ua uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  uw uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  ut uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  us uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
      (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@test.invalid', '{"role":"admin"}', '{}', now(), now()),
      (uw, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-web@test.invalid', '{"role":"webmaster"}', '{}', now(), now()),
      (ut, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-treas@test.invalid', '{"role":"treasurer"}', '{}', now(), now()),
      (us, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-student@test.invalid', '{"role":"student"}', '{}', now(), now());
    insert into public.site_pages (slug, title, blocks, draft) values ('rls-draft-page', 'Draft', '[]', true);

    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    select count(*) into n from public.site_pages where slug = 'rls-draft-page'; r := r || jsonb_build_object('anon_sees_draft_page', n);
    select count(*) into n from public.site_nav; r := r || jsonb_build_object('anon_reads_nav', n);
    begin insert into public.site_pages (slug, title) values ('rls-anon', 'x'); r := r || jsonb_build_object('anon_add_page', 'ok');
    exception when others then r := r || jsonb_build_object('anon_add_page', sqlstate); end;
    update public.site_nav set nav = nav where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('anon_edit_nav', rc);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', uw, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin insert into public.site_pages (slug, title, blocks, system) values ('home', 'Home', '[]', true)
      on conflict (slug) do update set blocks = excluded.blocks; r := r || jsonb_build_object('web_upsert_home', 'ok');
    exception when others then r := r || jsonb_build_object('web_upsert_home', sqlstate); end;
    begin insert into public.site_pages (slug, title) values ('rls-web-page', 'W'); r := r || jsonb_build_object('web_add_page', 'ok');
    exception when others then r := r || jsonb_build_object('web_add_page', sqlstate); end;
    select count(*) into n from public.site_pages where slug = 'rls-draft-page'; r := r || jsonb_build_object('web_sees_draft_page', n);
    update public.site_nav set nav = nav where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('web_edit_nav', rc);
    begin delete from public.site_pages where slug = 'home'; r := r || jsonb_build_object('web_delete_builtin', 'ok');
    exception when others then r := r || jsonb_build_object('web_delete_builtin', sqlstate); end;
    begin update public.site_pages set slug = 'house' where slug = 'home'; r := r || jsonb_build_object('web_rename_builtin', 'ok');
    exception when others then r := r || jsonb_build_object('web_rename_builtin', sqlstate); end;
    delete from public.site_pages where slug = 'rls-web-page'; get diagnostics rc = row_count; r := r || jsonb_build_object('web_delete_custom', rc);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.site_nav set nav = nav where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('admin_edit_nav', rc);
    update public.site_pages set title = title where slug = 'home'; get diagnostics rc = row_count; r := r || jsonb_build_object('admin_edit_home', rc);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', ut, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.site_pages set title = 'x' where slug = 'home'; get diagnostics rc = row_count; r := r || jsonb_build_object('treas_edit_home', rc);
    update public.site_nav set nav = nav where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('treas_edit_nav', rc);
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin insert into public.site_pages (slug, title) values ('rls-student', 'S'); r := r || jsonb_build_object('student_add_page', 'ok');
    exception when others then r := r || jsonb_build_object('student_add_page', sqlstate); end;
    select count(*) into n from public.site_pages where slug = 'rls-draft-page'; r := r || jsonb_build_object('student_sees_draft_page', n);
    execute 'reset role';

    raise exception 'rls_test_rollback';
  exception when raise_exception then
    if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
  insert into rls_results2 select key, value from jsonb_each_text(r);
end $$;

select t.test, t.got, e.want, case when t.got = e.want then 'PASS' else 'FAIL' end as result
from rls_results2 t left join (values
  ('anon_sees_draft_page','0'),('anon_reads_nav','1'),('anon_add_page','42501'),('anon_edit_nav','0'),
  ('web_upsert_home','ok'),('web_add_page','ok'),('web_sees_draft_page','1'),('web_edit_nav','1'),('web_delete_builtin','42501'),('web_rename_builtin','42501'),('web_delete_custom','1'),
  ('admin_edit_nav','1'),('admin_edit_home','1'),
  ('treas_edit_home','0'),('treas_edit_nav','0'),('student_add_page','42501'),('student_sees_draft_page','0')
) as e(test, want) on e.test = t.test order by result, t.test;
