-- Editable pages (About, Director, Instruments) and the six orchestras.
-- Same rule as events and news: the public reads published rows, admin
-- and webmaster edit, and a change triggers a rebuild.

create table public.pages (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  description text,
  sort        int not null default 0,
  body        text not null default '',
  draft       boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.ensembles (
  id           text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  sort         int not null default 0,
  period       text,
  grades       text,
  gmea_level   text,
  requirements text,
  summary      text,
  body         text not null default '',
  draft        boolean not null default false,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create trigger pages_touch before update on public.pages for each row execute function public.touch_updated_at();
create trigger ensembles_touch before update on public.ensembles for each row execute function public.touch_updated_at();

alter table public.pages enable row level security;
alter table public.ensembles enable row level security;

create policy public_read_pages on public.pages
  for select using (not draft);
create policy editors_all_pages on public.pages
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

create policy public_read_ensembles on public.ensembles
  for select using (not draft);
create policy editors_all_ensembles on public.ensembles
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

create trigger rebuild_on_pages after insert or update or delete on public.pages
  for each statement execute function private.request_rebuild();
create trigger rebuild_on_ensembles after insert or update or delete on public.ensembles
  for each statement execute function private.request_rebuild();
