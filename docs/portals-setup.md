# Portals — how they work and how to run them

Five roles: **admin** (director), **webmaster** (student), **treasurer**
(booster board), **student**, and **family**.

> **The director must not see fee or payment records.** That is a
> deliberate separation of duties, not an oversight — money is the
> boosters' responsibility, not the teacher's. Any change that gives the
> `admin` role access to `charges` or `payments` is a bug.

---

## What's live and what isn't

| Area | Status |
| --- | --- |
| Sign in, password reset, role-based portals | **Live** |
| **Pages**: every page is a stack of sections; add, edit, reorder, remove sections, upload photos, add new pages (admin + webmaster) | **Live** |
| Header menu and footer (admin + webmaster) | **Live** |
| Concerts & events, announcements, orchestras, ring photos (admin + webmaster) | **Live**: edits publish to the public site on its next build |
| Design & Appearance: colours, fonts, header size, homepage sections (admin) | **Live** |
| Roster, linking student and parent logins (admin) | **Live** |
| Daily board, with Present mode (admin) and catch-up for students | **Live** |
| Forms with QR codes, answers, "hasn't answered" list and CSV export | **Live** |
| Fees, charges, online payment (treasurer + family) | **Demo only.** Sample data, clearly labelled |

### Before payments go live

Two approvals are needed, and neither is Mr. Hood's alone to give.

- [ ] **The Orchestra Association must own the Stripe account.** Its EIN,
      its bank account, the treasurer as account owner. Stripe requires
      account owners to be 18+, so this cannot be in a student's name.
- [ ] **The boosters must sign off on storing payment records.** A table
      of which families have paid what is financial data about minors'
      households. The treasurer and the booster board need to agree to it
      in writing.

The `charges` and `payments` tables and their policies already exist and
are tested; what's missing is the Stripe webhook that writes `payments`
(using the service role key, server-side) and the treasurer/family UI.

---

## What each role can do

| Role | Who | Can | Can't |
| --- | --- | --- | --- |
| `admin` | Mr. Hood | Edit every page, the menu and design; roster; daily board; forms and answers; view as student/family | See fees or payments |
| `webmaster` | Student | Edit every page and the menu; events, announcements, orchestras, photos | Roster, boards, forms, design, money |
| `treasurer` | Booster board | Fees and payments (when live) | Edit site content |
| `student` | In the class | Today's board, past boards, their forms, announcements | Other students, money |
| `family` | Parents | Their own students, family forms, announcements, their own fees (when live) | Other families |

All of this is enforced by Row Level Security in the database, not by
the menus. The portal pages talk to Supabase straight from the browser
with the public key, so a user who edits the page code still can't read
or change anything their role doesn't allow.

---

## How it fits together

- **Public site**: static pages built by Astro. At build time it reads
  pages, the menu, events, news, ensembles, ring photos and design
  settings from Supabase (`src/lib/content.ts`). Without Supabase, it
  reads `src/content/` instead, so it still builds with zero accounts.
- **Pages are sections, like Squarespace.** Each page is an ordered list
  of sections (`src/lib/blocks.ts`): banner photo, heading, text, photo
  and text, image, quote, buttons, cards, list, upcoming concerts, full
  calendar, photo ring, orchestras, news. Each type has one fixed layout
  (`src/components/Blocks.astro`), so editors can't break a page on
  phones. The built-in pages ship as JSON in `src/content/site/`; the
  first time someone saves one in the portal, the database copy takes
  over. Custom pages live only in the database, at `/<address>`.
- **Portal**: static pages under `/portal` whose scripts sign in and
  read/write Supabase directly (`src/portal/client.ts`).
- **Publishing**: when content changes, a database trigger POSTs to the
  host's deploy hook (if one is set, see below), which rebuilds the site.
  The nightly GitHub Action rebuilds anyway, so past events still move.
- **Schema and policies**: `supabase/migrations/`. Permission tests:
  `supabase/tests/rls_check.sql`.

---

## The Supabase project

- **Project:** `fpcaeoqfxnjezwkqeqpu` in the "Alpharetta Orchestra"
  organization, owned by `alpharettaorchestras@gmail.com`. Keep it under
  an orchestra-owned account, never a personal one.
- **Already done:** all three migrations applied, events, news and
  ensembles seeded, sign-ups disabled (invite-only), minimum password
  length 10, and every permission check passing (47 in
  `rls_check.sql`, 17 in `rls_check_pages.sql`). Pages and the menu
  don't need seeding: they start from the files in the repo.

### Local `.env`

Copy `.env.example` to `.env` and fill in the project URL and the
**publishable** key (Project Settings > API Keys). Both are public.
**Never** put the secret / `service_role` key in `.env`, in `src/`, or
in the host's public build variables.

---

## Creating accounts

Accounts are invite-only. For each person:

1. Supabase dashboard > **Authentication > Users > Add user > Send
   invitation**, with their email. They get an email, click it, and
   choose a password on `/portal/reset`.
2. New accounts start as **family**. To give someone another role, run
   this in **SQL Editor** (change the email and role):

   ```sql
   update public.profiles set role = 'admin', full_name = 'Jake Hood'
   where email = 'hoodj3@fultonschools.org';
   ```

   Roles: `admin`, `webmaster`, `treasurer`, `student`, `family`.
3. For students and parents, Mr. Hood then links their logins to the
   right student under **Roster** in the portal.

**Who grants `treasurer`?** If the director could assign roles, he could
assign himself treasurer and the separation above would be decorative.
Roles are set in the Supabase dashboard only, not from inside the app.
Agree with the booster board who holds that dashboard access.

**When a webmaster graduates:** delete their user under Authentication >
Users. Nothing else to change or re-share.

---

## Going live (when the site is deployed)

1. **Auth URLs:** Authentication > URL Configuration. Set **Site URL** to
   the real domain and add `https://<domain>/portal/reset` to the
   redirect allow list. (They currently point at `localhost:4321`.)
2. **Email:** Supabase's built-in email is rate-limited to a few messages
   an hour, fine for testing, not for inviting a whole class. Add an SMTP
   provider under Authentication > Emails before mass invites.
3. **Deploy hook** (so edits publish within minutes): create a deploy
   hook in Cloudflare Pages or Netlify, then in SQL Editor:

   ```sql
   insert into private.config values ('deploy_hook_url', 'https://...')
   on conflict (key) do update set value = excluded.value;
   ```

   Also add the same URL as the `DEPLOY_HOOK_URL` GitHub secret for the
   nightly rebuild.
4. **Build variables on the host:** `PUBLIC_SUPABASE_URL` and
   `PUBLIC_SUPABASE_ANON_KEY` (the publishable key).

---

## Verify before launch, and after any policy change

Paste `supabase/tests/rls_check.sql`, then `supabase/tests/rls_check_pages.sql`, into SQL Editor and run them. It
creates pretend users and rows, checks what each role can see and do,
then rolls everything back. Every row should say **PASS**. Among other
things it confirms:

- `admin` gets **zero rows** from `charges` and `payments`
- `webmaster` can't see students, boards, forms or money, or edit design
- a family sees only its own student, charges and payments
- a student sees today's board only once it's published, and every
  earlier one
- nobody can change their own role
- the treasurer can read payments but can't insert a fake one
- built-in pages can't be deleted or renamed, and drafts stay off the site
