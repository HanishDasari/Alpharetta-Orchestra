-- Presentations: slide decks the director builds and presents in the
-- browser, like Google Slides. Slides are JSON:
--   [{ id, layout: title|text|image|split, title, md, image }]
-- A deck marked `shared` can be opened by students and families from
-- their portal (read-only); otherwise only the director sees it.

create table public.presentations (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Untitled presentation',
  slides      jsonb not null default '[]',
  shared      boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger presentations_touch before update on public.presentations
  for each row execute function public.touch_updated_at();

alter table public.presentations enable row level security;

create policy admin_all_presentations on public.presentations
  for all using (current_role_is('admin')) with check (current_role_is('admin'));
create policy class_read_shared_presentations on public.presentations
  for select using (shared and current_role_in(array['student', 'family']::public.user_role[]));
