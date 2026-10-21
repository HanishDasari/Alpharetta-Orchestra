# Alpharetta High School Orchestras

The website for the AHS Orchestra program. Built with [Astro](https://astro.build).

**Live site:** _not deployed yet_
**Repo:** https://github.com/HanishDasari/Alpharetta-Orchestra

---

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:4321

To connect the portal and the editable content, copy `.env.example` to
`.env` and fill in the Supabase project URL and publishable key. Without
it, the public site still builds from the Markdown files and the portal
says it isn't connected. See [docs/portals-setup.md](docs/portals-setup.md).

Other commands:

```bash
npm run build     # build the production site into dist/
npm run preview   # preview that build locally
```

---

## How content works

**With Supabase connected (the normal setup), content is edited in the
portal** at `/portal`: concerts, announcements, pages, orchestras, ring
photos and design. The site rebuilds when something changes. The
Markdown in `src/content/` is the fallback when Supabase isn't
configured, and the starting point that `npm run seed` loads into a new
database. After seeding, edit in the portal, not the files.

The Markdown folders, each with a defined shape (see `src/content/config.ts`):

| Folder | What it holds |
| --- | --- |
| `events/` | Concerts, festivals, trips |
| `ensembles/` | The six orchestras |
| `news/` | Announcements (shown on `/news`) |
| `pages/` | Static pages (About, Director, etc.) |

### The important idea: events are entered once

A single file in `src/content/events/` automatically drives:

- the **upcoming** list on `/calendar`
- the **past events** list on `/calendar` — an event moves here on its own
  once its date passes, so nobody ever has to maintain a "past events" page
- the event's own page at `/events/<file-name>`
- the **`/events.ics` feed** families subscribe to

- the **Coming up** block on the homepage (next three)

**"On its own" needs a nightly rebuild.** The site is static, so upcoming
vs. past is decided when the site is built. Without a rebuild, a concert
stays under Upcoming after it's over. `.github/workflows/nightly-rebuild.yml`
handles this once you add the hosting provider's deploy hook as a repo
secret named `DEPLOY_HOOK_URL` (setup steps are in that file).

### Adding a concert

In the portal: **Concerts & Events > New event**. Without Supabase,
create a new file in `src/content/events/`, for example
`spring-concert-2027.md`:

```markdown
---
title: Spring Concert 2027
start: 2027-05-06T19:00:00-04:00
end: 2027-05-06T21:00:00-04:00
location: AHS Performing Arts Center
ensembles: [Concert, Silver, Philharmonia, Sinfonia, Symphony]
summary: One-line description that shows on cards.
---

Longer description goes here. Markdown works.
```

Valid `ensembles` values: `Concert`, `Silver`, `Philharmonia`, `Sinfonia`,
`Symphony`, `Chamber`, `Full Orchestra`.

Set `draft: true` to keep something unpublished.

For an all-day event (a trip, a festival day), set `allDay: true` and use
plain dates with no time. Add `end` for events that span several days:

```markdown
start: 2027-03-12
end: 2027-03-14
allDay: true
```

---

## Roadmap

- [x] **Phase 1 — content site.** Homepage, orchestras, calendar, about,
      student resources, contact, news.
- [x] **Phase 2 — editing and portals.** Supabase-backed portal: the
      director and webmaster edit content in the browser; roster, daily
      board, forms; student and family portals. See
      [docs/portals-setup.md](docs/portals-setup.md).
- [ ] **Phase 3 — deploy.** Cloudflare Pages or Netlify, then point the
      domain over. Add the `DEPLOY_HOOK_URL` secret so the nightly rebuild
      runs.
- [ ] **Phase 4 — payments.** Not before the rest is stable. See below.

---

## Things to confirm before launch

- [x] **Prior playing experience is required** for Concert and Silver.
      (The old site's "Orchestra 101" page said otherwise — that copy was
      wrong and should not be carried over.)
- [x] **Chamber Orchestra is still running.** Included as the sixth
      ensemble. Still to confirm: current roster size, and whether Chamber
      members also play in Symphony.
- [x] **Contact email.** Mr. Hood's school address is on `/contact` and
      in the footer. All contact details and off-site links live in
      `src/lib/links.ts`.
- [x] Instagram and YouTube links in the footer and on `/contact`.
- [ ] The three sample events are placeholders. Replace them with the
      real season calendar in the portal.
- [ ] Audition materials: the Student Resources card says "posted here
      each spring" until there's something to link to.
- [ ] The handbook PDF, program book PDF and store still live on
      Squarespace (`src/lib/links.ts`). Move them before the domain does.

### Deferred until the site is done

- **Domain.** Who owns `alpharettaorchestra.com` — school, director, or
  boosters? Only needed at launch.
- `alpharettaorchestra.org` (the old booster site) is a dead domain that
  still appears in Google results. Worth a redirect or takedown eventually.

---

## Payments — read before touching

The store (dues, patron program, uniforms) currently runs on Squarespace.
**Leave it there for now.** If it later moves to Stripe:

- The Stripe account must be owned by the **Orchestra Association** — its
  EIN, its bank account, the treasurer as account owner. Not a student.
  Stripe requires account owners to be 18+.
- Standard rate is 2.9% + $0.30 per transaction.
- Stripe's nonprofit rate (2.2% + $0.30) requires that **>80% of payment
  volume be tax-deductible donations**. Dues, registrations, and uniform
  orders don't count toward that, so the program likely won't qualify.

---

## Handing this off

This site should outlive whoever is webmaster. Before you graduate:

1. Make sure the GitHub repo, hosting, and domain are all under an
   **orchestra/booster account**, not a personal one.
2. Add the next webmaster as a collaborator.
3. Walk them through `npm run dev` and adding one event.
