-- =================================================================
-- Permission check. Paste into Supabase > SQL Editor and run.
--
-- Creates six pretend users (admin, webmaster, treasurer, student, two
-- families) plus sample rows, signs in as each one through the real
-- Row Level Security policies, records what they can see and do, then
-- rolls ALL of it back. Nothing is left in the database.
--
-- Every row of the result should say PASS. Run it again after any
-- change to the policies in supabase/migrations/.
-- =================================================================

create temp table if not exists rls_results (test text, got text);
truncate rls_results;

do $$
declare
  r jsonb := '{}';
  n int;
  rc int;
  ua uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  uw uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  ut uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  us uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  uf1 uuid := 'aaaaaaaa-0000-0000-0000-000000000005';
  uf2 uuid := 'aaaaaaaa-0000-0000-0000-000000000006';
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  fs uuid := gen_random_uuid();
  ff uuid := gen_random_uuid();
  ev_total int; ev_public int;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
      (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@test.invalid', '{"role":"admin"}', '{}', now(), now()),
      (uw, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-web@test.invalid', '{"role":"webmaster"}', '{}', now(), now()),
      (ut, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-treas@test.invalid', '{"role":"treasurer"}', '{}', now(), now()),
      (us, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-student@test.invalid', '{"role":"student"}', '{}', now(), now()),
      (uf1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fam1@test.invalid', '{}', '{}', now(), now()),
      (uf2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fam2@test.invalid', '{}', '{}', now(), now());
    select count(*) into n from public.profiles where id in (uf1, uf2) and role = 'family';
    r := r || jsonb_build_object('signup_defaults_to_family', n);

    insert into public.students (id, first_name, last_name, profile_id) values (s1, 'Test', 'One', us), (s2, 'Test', 'Two', null);
    insert into public.guardians values (uf1, s1);
    insert into public.charges (id, student_id, label, amount_cents) values (c1, s1, 'Fee', 19500), (c2, s2, 'Fee', 19500);
    insert into public.payments (charge_id, stripe_payment_intent, amount_cents, status) values (c1, 'pi_rls_test', 19500, 'succeeded');
    insert into public.events (slug, title, start_at, draft) values ('rls-draft-test', 'Draft', now(), true);
    insert into public.forms (id, title, audience) values (fs, 'S', 'student'), (ff, 'F', 'family');
    insert into public.boards (board_date, body, published) values (school_today(), 'today', false), (school_today() - 1, 'yesterday', false)
      on conflict (board_date) do nothing;
    select count(*) into ev_total from public.events;
    select count(*) into ev_public from public.events where not draft;

    -- Anonymous visitor
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    select count(*) into n from public.events; r := r || jsonb_build_object('anon_events_eq_public', (n = ev_public)::int);
    select count(*) into n from public.profiles; r := r || jsonb_build_object('anon_profiles', n);
    select count(*) into n from public.students; r := r || jsonb_build_object('anon_students', n);
    select count(*) into n from public.charges; r := r || jsonb_build_object('anon_charges', n);
    select count(*) into n from public.boards; r := r || jsonb_build_object('anon_boards', n);
    select count(*) into n from public.forms; r := r || jsonb_build_object('anon_forms', n);
    execute 'reset role';

    -- Admin (director)
    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.charges; r := r || jsonb_build_object('admin_charges', n);
    select count(*) into n from public.payments; r := r || jsonb_build_object('admin_payments', n);
    select count(*) into n from public.students where id in (s1, s2); r := r || jsonb_build_object('admin_students', n);
    select count(*) into n from public.events; r := r || jsonb_build_object('admin_sees_drafts', (n = ev_total)::int);
    select count(*) into n from public.boards where board_date >= school_today() - 1; r := r || jsonb_build_object('admin_boards', n);
    update public.site_settings set settings = settings where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('admin_can_edit_design', rc);
    update public.profiles set role = 'treasurer' where id = ua; get diagnostics rc = row_count; r := r || jsonb_build_object('admin_self_promote', rc);
    execute 'reset role';

    -- Webmaster (student account)
    perform set_config('request.jwt.claims', json_build_object('sub', uw, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.charges; r := r || jsonb_build_object('web_charges', n);
    select count(*) into n from public.payments; r := r || jsonb_build_object('web_payments', n);
    select count(*) into n from public.students; r := r || jsonb_build_object('web_students', n);
    select count(*) into n from public.boards; r := r || jsonb_build_object('web_boards', n);
    select count(*) into n from public.forms; r := r || jsonb_build_object('web_forms', n);
    select count(*) into n from public.profiles; r := r || jsonb_build_object('web_profiles', n);
    select count(*) into n from public.events; r := r || jsonb_build_object('web_sees_drafts', (n = ev_total)::int);
    begin insert into public.events (slug, title, start_at) values ('rls-web-insert', 'W', now()); r := r || jsonb_build_object('web_add_event', 'ok');
    exception when others then r := r || jsonb_build_object('web_add_event', sqlstate); end;
    update public.site_settings set settings = settings where id = 1; get diagnostics rc = row_count; r := r || jsonb_build_object('web_edit_design', rc);
    execute 'reset role';

    -- Treasurer
    perform set_config('request.jwt.claims', json_build_object('sub', ut, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.charges where id in (c1, c2); r := r || jsonb_build_object('treas_charges', n);
    select count(*) into n from public.payments where stripe_payment_intent = 'pi_rls_test'; r := r || jsonb_build_object('treas_payments', n);
    select count(*) into n from public.students where id in (s1, s2); r := r || jsonb_build_object('treas_students', n);
    select count(*) into n from public.boards; r := r || jsonb_build_object('treas_boards', n);
    begin insert into public.payments (charge_id, stripe_payment_intent, amount_cents, status) values (c2, 'pi_fake', 19500, 'succeeded'); r := r || jsonb_build_object('treas_fake_payment', 'ok');
    exception when others then r := r || jsonb_build_object('treas_fake_payment', sqlstate); end;
    begin insert into public.events (slug, title, start_at) values ('rls-treas-insert', 'T', now()); r := r || jsonb_build_object('treas_add_event', 'ok');
    exception when others then r := r || jsonb_build_object('treas_add_event', sqlstate); end;
    execute 'reset role';

    -- Student
    perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.students; r := r || jsonb_build_object('student_students', n);
    select count(*) into n from public.boards where board_date = school_today(); r := r || jsonb_build_object('student_unpublished_today', n);
    select count(*) into n from public.boards where board_date = school_today() - 1; r := r || jsonb_build_object('student_yesterday', n);
    select count(*) into n from public.forms where id in (fs, ff); r := r || jsonb_build_object('student_forms', n);
    select count(*) into n from public.charges; r := r || jsonb_build_object('student_charges', n);
    update public.profiles set role = 'admin' where id = us; get diagnostics rc = row_count; r := r || jsonb_build_object('student_self_promote', rc);
    begin insert into public.form_responses (form_id, profile_id, answers) values (fs, us, '{}'); r := r || jsonb_build_object('student_answer_own_form', 'ok');
    exception when others then r := r || jsonb_build_object('student_answer_own_form', sqlstate); end;
    begin insert into public.form_responses (form_id, profile_id, answers) values (ff, us, '{}'); r := r || jsonb_build_object('student_answer_family_form', 'ok');
    exception when others then r := r || jsonb_build_object('student_answer_family_form', sqlstate); end;
    begin insert into public.form_responses (form_id, profile_id, answers) values (fs, uf1, '{}'); r := r || jsonb_build_object('student_answer_as_someone_else', 'ok');
    exception when others then r := r || jsonb_build_object('student_answer_as_someone_else', sqlstate); end;
    execute 'reset role';

    -- Family linked to student one
    perform set_config('request.jwt.claims', json_build_object('sub', uf1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.students; r := r || jsonb_build_object('fam1_students', n);
    select count(*) into n from public.charges; r := r || jsonb_build_object('fam1_charges', n);
    select count(*) into n from public.payments; r := r || jsonb_build_object('fam1_payments', n);
    select count(*) into n from public.forms where id in (fs, ff); r := r || jsonb_build_object('fam1_forms', n);
    select count(*) into n from public.form_responses; r := r || jsonb_build_object('fam1_sees_others_answers', n);
    select count(*) into n from public.boards; r := r || jsonb_build_object('fam1_boards', n);
    execute 'reset role';

    -- Family with no linked student
    perform set_config('request.jwt.claims', json_build_object('sub', uf2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.students; r := r || jsonb_build_object('fam2_students', n);
    select count(*) into n from public.charges; r := r || jsonb_build_object('fam2_charges', n);
    select count(*) into n from public.payments; r := r || jsonb_build_object('fam2_payments', n);
    execute 'reset role';

    raise exception 'rls_test_rollback';
  exception when raise_exception then
    if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
  insert into rls_results select key, value from jsonb_each_text(r);
end $$;

select t.test, t.got, e.want, case when t.got = e.want then 'PASS' else 'FAIL' end as result
from rls_results t
left join (values
  ('signup_defaults_to_family','2'),
  ('anon_events_eq_public','1'),('anon_profiles','0'),('anon_students','0'),('anon_charges','0'),('anon_boards','0'),('anon_forms','0'),
  ('admin_charges','0'),('admin_payments','0'),('admin_students','2'),('admin_sees_drafts','1'),('admin_boards','2'),('admin_can_edit_design','1'),('admin_self_promote','0'),
  ('web_charges','0'),('web_payments','0'),('web_students','0'),('web_boards','0'),('web_forms','0'),('web_profiles','1'),('web_sees_drafts','1'),('web_add_event','ok'),('web_edit_design','0'),
  ('treas_charges','2'),('treas_payments','1'),('treas_students','2'),('treas_boards','0'),('treas_fake_payment','42501'),('treas_add_event','42501'),
  ('student_students','1'),('student_unpublished_today','0'),('student_yesterday','1'),('student_forms','1'),('student_charges','0'),('student_self_promote','0'),
  ('student_answer_own_form','ok'),('student_answer_family_form','42501'),('student_answer_as_someone_else','42501'),
  ('fam1_students','1'),('fam1_charges','1'),('fam1_payments','1'),('fam1_forms','1'),('fam1_sees_others_answers','0'),('fam1_boards','0'),
  ('fam2_students','0'),('fam2_charges','0'),('fam2_payments','0')
) as e(test, want) on e.test = t.test
order by result, t.test;
