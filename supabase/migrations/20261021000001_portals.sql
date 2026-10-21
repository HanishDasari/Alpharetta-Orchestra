-- =================================================================
-- AHS Orchestras portals
--
-- Row Level Security is the security boundary. The portal pages talk
-- to Supabase straight from the browser with the public anon key, so
-- every rule about who can see or change what lives in the policies
-- below, not in the page code. See docs/portals-setup.md.
--
-- Separation of duties: the director (admin) never sees fees or
-- payments. Any policy that gives admin access to charges or payments
-- is a bug.
-- =================================================================

-- Roles -----------------------------------------------------------
create type public.user_role as enum ('admin', 'treasurer', 'webmaster', 'student', 'family');

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        public.user_role not null default 'family',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Every new login gets a profile. The role comes from app_metadata,
-- which only the service role (dashboard, server) can set, so nobody
-- can pick their own role by signing up with crafted metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'family')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer so it can read profiles past RLS. The pinned
-- search_path stops anyone shadowing `profiles` with their own table.
create or replace function public.current_role_is(target public.user_role)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = target);
$$;

create or replace function public.current_role_in(targets public.user_role[])
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = any(targets));
$$;

-- Students and who they belong to ---------------------------------
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  grad_year   int,
  ensemble    text,
  period      text,
  -- the student's own login, if they have one
  profile_id  uuid unique references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.guardians (
  profile_id  uuid references public.profiles(id) on delete cascade,
  student_id  uuid references public.students(id) on delete cascade,
  primary key (profile_id, student_id)
);

-- Is the signed-in user a guardian of this student? security definer
-- so policies on other tables can ask without needing guardians RLS.
create or replace function public.is_guardian_of(sid uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from guardians where profile_id = auth.uid() and student_id = sid);
$$;

-- Money (portal shows these as a demo for now; schema is real) -----
create table public.charges (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  label        text not null,
  amount_cents int not null check (amount_cents > 0),
  due_date     date,
  created_at   timestamptz not null default now()
);

-- Stripe stays the source of truth for money; this only mirrors it.
create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  charge_id             uuid not null references public.charges(id) on delete restrict,
  stripe_payment_intent text unique not null,
  amount_cents          int not null,
  status                text not null,          -- succeeded | pending | refunded
  paid_at               timestamptz,
  created_at            timestamptz not null default now()
);

-- Public website content -------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  all_day     boolean not null default false,
  location    text not null default 'Alpharetta High School',
  address     text,
  ensembles   text[] not null default '{}',
  summary     text check (char_length(summary) <= 200),
  body        text not null default '',
  link_label  text,
  link_url    text,
  featured    boolean not null default false,
  draft       boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  check (end_at is null or end_at >= start_at)
);

create table public.news (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  date        date not null default current_date,
  author      text not null default 'AHS Orchestras',
  summary     text,
  body        text not null default '',
  draft       boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- Photos in the homepage ring. Files live in the `ring` storage bucket.
create table public.ring_photos (
  id          uuid primary key default gen_random_uuid(),
  path        text unique not null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- One row of site-wide design settings, read when the site builds.
create table public.site_settings (
  id          int primary key default 1 check (id = 1),
  settings    jsonb not null default '{}',
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

-- Classroom ---------------------------------------------------------
-- The daily board. Students see a board once it's published, and
-- every board from an earlier day, so absent students can catch up.
create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  board_date  date unique not null default current_date,
  title       text not null default '',
  body        text not null default '',
  published   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create or replace function public.school_today()
returns date language sql stable as $$
  select (now() at time zone 'America/New_York')::date;
$$;

create table public.forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  -- [{ id, label, type: text|textarea|choice|checkbox, options?, required }]
  fields      jsonb not null default '[]',
  audience    text not null default 'both' check (audience in ('student', 'family', 'both')),
  open        boolean not null default true,
  closes_on   date,
  created_at  timestamptz not null default now()
);

create table public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  answers      jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (form_id, profile_id)
);

-- Can the signed-in user answer this form right now?
create or replace function public.can_answer(fid uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from forms f
    where f.id = fid
      and f.open
      and (f.closes_on is null or f.closes_on >= school_today())
      and (
        (f.audience in ('student', 'both') and current_role_is('student')) or
        (f.audience in ('family', 'both') and current_role_is('family'))
      )
  );
$$;

-- Keep updated_at honest ---------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger news_touch before update on public.news for each row execute function public.touch_updated_at();
create trigger boards_touch before update on public.boards for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

-- =================================================================
-- Row Level Security
-- =================================================================
alter table public.profiles       enable row level security;
alter table public.students       enable row level security;
alter table public.guardians      enable row level security;
alter table public.charges        enable row level security;
alter table public.payments       enable row level security;
alter table public.events         enable row level security;
alter table public.news           enable row level security;
alter table public.ring_photos    enable row level security;
alter table public.site_settings  enable row level security;
alter table public.boards         enable row level security;
alter table public.forms          enable row level security;
alter table public.form_responses enable row level security;

-- Profiles ----------------------------------------------------------
-- Everyone reads their own. Admin reads all to link roster logins and
-- see who answered forms; treasurer reads all to put names to money.
create policy own_profile on public.profiles
  for select using (id = auth.uid());
create policy staff_read_profiles on public.profiles
  for select using (current_role_in(array['admin', 'treasurer']::public.user_role[]));

-- There is deliberately NO update policy on profiles, so nobody can
-- change their own role. Roles are set in the Supabase dashboard.
-- If people should edit their own name, grant that column only:
--   revoke update on public.profiles from authenticated;
--   grant update (full_name) on public.profiles to authenticated;

-- Students & guardians ------------------------------------------------
create policy admin_all_students on public.students
  for all using (current_role_is('admin')) with check (current_role_is('admin'));
create policy treasurer_read_students on public.students
  for select using (current_role_is('treasurer'));
create policy family_own_students on public.students
  for select using (is_guardian_of(id));
create policy student_self on public.students
  for select using (profile_id = auth.uid());

create policy own_guardian_links on public.guardians
  for select using (profile_id = auth.uid());
create policy admin_all_guardians on public.guardians
  for all using (current_role_is('admin')) with check (current_role_is('admin'));
create policy treasurer_read_guardians on public.guardians
  for select using (current_role_is('treasurer'));

-- Charges & payments: treasurer and the family only. Never admin. -----
create policy treasurer_all_charges on public.charges
  for all using (current_role_is('treasurer')) with check (current_role_is('treasurer'));
create policy family_own_charges on public.charges
  for select using (is_guardian_of(student_id));

-- Read-only for everyone. Rows are written only by the Stripe webhook,
-- which uses the service role key and bypasses RLS.
create policy treasurer_read_payments on public.payments
  for select using (current_role_is('treasurer'));
create policy family_own_payments on public.payments
  for select using (
    exists (select 1 from public.charges c where c.id = payments.charge_id and is_guardian_of(c.student_id))
  );

-- Website content: public reads published rows; admin and webmaster
-- edit. This is the "one editor, two permission levels" from the doc.
create policy public_read_events on public.events
  for select using (not draft);
create policy editors_all_events on public.events
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

create policy public_read_news on public.news
  for select using (not draft);
create policy editors_all_news on public.news
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

create policy public_read_ring on public.ring_photos
  for select using (true);
create policy editors_all_ring on public.ring_photos
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

-- Design is the director's, not the webmaster's.
create policy public_read_settings on public.site_settings
  for select using (true);
create policy admin_update_settings on public.site_settings
  for update using (current_role_is('admin')) with check (current_role_is('admin'));

-- Boards ----------------------------------------------------------------
create policy admin_all_boards on public.boards
  for all using (current_role_is('admin')) with check (current_role_is('admin'));
create policy student_read_boards on public.boards
  for select using (current_role_is('student') and (published or board_date < school_today()));

-- Forms -------------------------------------------------------------------
create policy admin_all_forms on public.forms
  for all using (current_role_is('admin')) with check (current_role_is('admin'));
create policy audience_read_forms on public.forms
  for select using (
    (audience in ('student', 'both') and current_role_is('student')) or
    (audience in ('family', 'both') and current_role_is('family'))
  );

create policy admin_read_responses on public.form_responses
  for select using (current_role_is('admin'));
create policy own_responses on public.form_responses
  for select using (profile_id = auth.uid());
create policy answer_form on public.form_responses
  for insert with check (profile_id = auth.uid() and can_answer(form_id));
create policy edit_own_answer on public.form_responses
  for update using (profile_id = auth.uid() and can_answer(form_id))
  with check (profile_id = auth.uid() and can_answer(form_id));

-- =================================================================
-- Storage: ring photos are public to read, editors upload
-- =================================================================
insert into storage.buckets (id, name, public) values ('ring', 'ring', true)
on conflict (id) do nothing;

create policy ring_public_read on storage.objects
  for select using (bucket_id = 'ring');
create policy ring_editors_insert on storage.objects
  for insert with check (bucket_id = 'ring' and current_role_in(array['admin', 'webmaster']::public.user_role[]));
create policy ring_editors_delete on storage.objects
  for delete using (bucket_id = 'ring' and current_role_in(array['admin', 'webmaster']::public.user_role[]));

-- =================================================================
-- Rebuild the public site when its content changes
--
-- The public site is static, so an edit shows up after the next build.
-- When private.config has a deploy_hook_url (from Cloudflare Pages or
-- Netlify), any change to events, news, ring photos or design settings
-- POSTs to it. Without one, edits wait for the nightly rebuild.
--   insert into private.config values ('deploy_hook_url', 'https://...');
-- The private schema isn't exposed through the API, so the URL stays
-- secret.
-- =================================================================
create extension if not exists pg_net;
create schema if not exists private;

create table private.config (
  key   text primary key,
  value text not null
);

create or replace function private.request_rebuild()
returns trigger language plpgsql security definer
set search_path = public, private as $$
declare
  hook text;
begin
  select value into hook from private.config where key = 'deploy_hook_url';
  if hook is not null and hook <> '' then
    perform net.http_post(url := hook, body := '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger rebuild_on_events after insert or update or delete on public.events
  for each statement execute function private.request_rebuild();
create trigger rebuild_on_news after insert or update or delete on public.news
  for each statement execute function private.request_rebuild();
create trigger rebuild_on_ring after insert or update or delete on public.ring_photos
  for each statement execute function private.request_rebuild();
create trigger rebuild_on_settings after update on public.site_settings
  for each statement execute function private.request_rebuild();
