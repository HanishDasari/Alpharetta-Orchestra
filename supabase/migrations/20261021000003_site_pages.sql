-- Section-based pages, like Squarespace: every page on the site is an
-- ordered list of sections (text, photo + text, quote, cards, upcoming
-- concerts...). The director and webmaster add, edit, reorder and remove
-- sections and pages; the layout of each section type stays fixed, so
-- nothing can break on phones. See src/lib/blocks.ts for section types.
--
-- This replaces the `pages` table (whole-page Markdown), whose content
-- moves into sections when the site is seeded.

create table public.site_pages (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  description text,
  blocks      jsonb not null default '[]',
  -- Built-in pages (home, calendar...) can't be deleted or renamed.
  system      boolean not null default false,
  draft       boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create trigger site_pages_touch before update on public.site_pages
  for each row execute function public.touch_updated_at();

alter table public.site_pages enable row level security;

create policy public_read_site_pages on public.site_pages
  for select using (not draft);
create policy editors_all_site_pages on public.site_pages
  for all using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

-- Built-in pages: editors can change their sections, not delete them.
create or replace function public.protect_system_pages()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.system then
    raise exception 'Built-in pages can''t be deleted' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.system and (new.slug <> old.slug or not new.system) then
    raise exception 'Built-in pages can''t be renamed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger site_pages_protect before update or delete on public.site_pages
  for each row execute function public.protect_system_pages();

create trigger rebuild_on_site_pages after insert or update or delete on public.site_pages
  for each statement execute function private.request_rebuild();

-- The header menu and footer are content, so editors change them too.
-- Design (colours, fonts) stays the director's, in site_settings.
create table public.site_nav (
  id          int primary key default 1 check (id = 1),
  nav         jsonb not null default '{}',
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.site_nav (id) values (1);

create trigger site_nav_touch before update on public.site_nav
  for each row execute function public.touch_updated_at();

alter table public.site_nav enable row level security;
create policy public_read_nav on public.site_nav for select using (true);
create policy editors_update_nav on public.site_nav
  for update using (current_role_in(array['admin', 'webmaster']::public.user_role[]))
  with check (current_role_in(array['admin', 'webmaster']::public.user_role[]));

create trigger rebuild_on_nav after update on public.site_nav
  for each statement execute function private.request_rebuild();

-- Images used in sections. Public to read, editors upload.
insert into storage.buckets (id, name, public) values ('site', 'site', true)
on conflict (id) do nothing;

create policy site_public_read on storage.objects
  for select using (bucket_id = 'site');
create policy site_editors_insert on storage.objects
  for insert with check (bucket_id = 'site' and current_role_in(array['admin', 'webmaster']::public.user_role[]));
create policy site_editors_delete on storage.objects
  for delete using (bucket_id = 'site' and current_role_in(array['admin', 'webmaster']::public.user_role[]));

-- The old whole-page table is superseded by site_pages.
drop table public.pages;
