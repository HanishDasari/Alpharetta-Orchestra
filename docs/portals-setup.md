# Portals — setup guide

Three roles were requested: **admin** (director), **webmaster** (student),
and **family** (parents paying fees).

Read this before writing any portal code. The first section is the part
that decides whether this gets built at all.

---

## Before any of this gets built

Two approvals are needed, and neither is Mr. Hood's alone to give.

- [ ] **The Orchestra Association must own the Stripe account.** Its EIN,
      its bank account, the treasurer as account owner. Stripe requires
      account owners to be 18+, so this cannot be in a student's name.
      Not a preference — an account in the wrong name is a real problem
      for the boosters.
- [ ] **The boosters must sign off on storing payment records.** A table
      of which families have paid what is financial data about minors'
      households. The treasurer and the booster board need to agree to it
      in writing, not just verbally.

Until both are done, build the admin and webmaster portals only. Those
touch nothing sensitive.

---

## What each role actually needs

| Role | Who | What they do | Sensitive? |
| --- | --- | --- | --- |
| `admin` | Mr. Hood | Everything. Edit content, see payment status, export data. | Yes — sees family records |
| `webmaster` | Student | Edit site content. No payment or family data at all. | No |
| `family` | Parents | See what they owe, pay it, get a receipt. Only their own record. | Yes — their own only |

**Important:** admin and webmaster are the *same feature* at two permission
levels — "edit the website without code." Don't build two editors. One
content system, two roles.

---

## Stack

All free tier.

| Piece | Tool | Free tier |
| --- | --- | --- |
| Auth + roles | Supabase Auth | 50,000 monthly active users |
| Database | Supabase Postgres | 500 MB |
| File/image storage | Supabase Storage | 1 GB |
| Payments | Stripe | No monthly fee; 2.9% + $0.30 per charge |
| Hosting | Cloudflare Pages | Unlimited static, 100k function calls/day |

### This changes the site's architecture

Right now the site is fully static — plain HTML files, nothing to attack,
nothing to maintain. Adding logins means:

- switching Astro from `static` to `hybrid` output and adding an adapter
- session handling, and the security bugs that come with it
- a database holding family payment records
- a real maintenance burden for whoever inherits it

That's the actual cost here, and it isn't money.

---

## Database schema

```sql
-- Roles ------------------------------------------------------------
create type user_role as enum ('admin', 'webmaster', 'family');

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        user_role not null default 'family',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Students, so a parent can be linked to their kid ------------------
create table students (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  grad_year   int,
  ensemble    text,
  created_at  timestamptz not null default now()
);

create table guardians (
  profile_id  uuid references profiles(id) on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  primary key (profile_id, student_id)
);

-- What a family owes -----------------------------------------------
create table charges (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  label       text not null,              -- 'Participation Fee 2026-27'
  amount_cents int not null check (amount_cents > 0),
  due_date    date,
  created_at  timestamptz not null default now()
);

-- What they've paid. Stripe stays the source of truth for money;
-- this table only mirrors it so the portal can show status.
create table payments (
  id              uuid primary key default gen_random_uuid(),
  charge_id       uuid not null references charges(id) on delete restrict,
  stripe_payment_intent text unique not null,
  amount_cents    int not null,
  status          text not null,          -- succeeded | pending | refunded
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
```

### Row Level Security

This is the part that keeps one family from reading another's records.
**Do not skip it.** Supabase tables are wide open until RLS is on.

```sql
alter table profiles enable row level security;
alter table students enable row level security;
alter table guardians enable row level security;
alter table charges  enable row level security;
alter table payments enable row level security;

create or replace function current_role_is(target user_role)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = target
  );
$$;

-- Admin sees everything
create policy admin_all_charges on charges
  for all using (current_role_is('admin'));

-- A family sees only charges for students they're linked to
create policy family_own_charges on charges
  for select using (
    exists (
      select 1 from guardians g
      where g.profile_id = auth.uid()
        and g.student_id = charges.student_id
    )
  );

-- Webmaster gets no access to charges at all — no policy, no rows.
```

Test RLS by logging in as each role and confirming a family account
returns zero rows for someone else's student. Do this before launch, not
after.

---

## Setup steps

1. Create a Supabase project at supabase.com — **under an orchestra-owned
   email**, not a personal one.
2. Run the schema above in the SQL editor.
3. Enable RLS policies and verify them per role.
4. Copy the project URL and anon key into `.env`:
   ```
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server only — never expose this
   ```
5. `.env` is already gitignored. Confirm it before the first commit.
6. Add the Astro adapter and switch to hybrid output.
7. Build login, then the admin portal, then family. Webmaster last — it's
   the CMS with reduced permissions.

---

## Order to build in

1. **Auth + roles** — login, role assignment, route protection
2. **Admin content editing** — the thing Mr. Hood actually asked for
3. **Webmaster** — same editor, fewer permissions
4. **Family portal** — *only after both approvals above are signed off*

Payments last. It's the riskiest piece and the site is useful without it.
