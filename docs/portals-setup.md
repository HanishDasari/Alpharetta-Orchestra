# Portals — setup guide

Four roles: **admin** (director), **treasurer** (booster board),
**webmaster** (student), and **family** (parents paying fees).

> **The director must not see fee or payment records.** That is a
> deliberate separation of duties, not an oversight — money is the
> boosters' responsibility, not the teacher's. Any change that gives the
> `admin` role access to `charges` or `payments` is a bug.

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

| Role | Who | What they do | Sees money? |
| --- | --- | --- | --- |
| `admin` | Mr. Hood | Edit all site content. See the roster. | **No** |
| `treasurer` | Booster board | Fees, payments, charges, reporting. No site editing. | Yes — all families |
| `webmaster` | Student | Edit site content. No roster, no money. | No |
| `family` | Parents | Their own balance, forms, and payment. | Their own only |

Two things fall out of this:

- **admin and webmaster are the same feature** at two permission levels —
  "edit the website without code." Don't build two editors. One content
  system, two roles.
- **admin and treasurer barely overlap.** The director edits the site;
  the treasurer handles money. Neither needs the other's screens.

### Open question for the boosters

Who grants the `treasurer` role? If the director can assign roles, he can
assign himself treasurer, and the separation above is decorative. The
clean answer is that treasurer access is granted by the booster board
through Supabase directly, not from inside the app. Confirm this before
building role management.

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
create type user_role as enum ('admin', 'treasurer', 'webmaster', 'family');

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

-- Treasurer is the ONLY role with full access to money.
-- Note this is treasurer, not admin. Changing it to admin would hand
-- the director every family's payment record.
create policy treasurer_all_charges on charges
  for all using (current_role_is('treasurer'));

create policy treasurer_all_payments on payments
  for all using (current_role_is('treasurer'));

-- A family sees only charges for students they're linked to
create policy family_own_charges on charges
  for select using (
    exists (
      select 1 from guardians g
      where g.profile_id = auth.uid()
        and g.student_id = charges.student_id
    )
  );

-- The director can read the roster, but no money.
create policy admin_read_students on students
  for select using (current_role_is('admin'));

-- No policy naming 'admin' or 'webmaster' exists on charges or payments,
-- so those roles get zero rows from both tables.
```

### Verify this before launch, not after

Log in as each role and confirm:

- [ ] `admin` gets **zero rows** from `charges` and `payments`
- [ ] `webmaster` gets zero rows from `charges`, `payments`, and `students`
- [ ] `family` gets zero rows for a student they are not a guardian of
- [ ] `treasurer` cannot edit site content

The first one is the one people get wrong, because "admin" sounds like it
should see everything. Here it must not.

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
