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

Other commands:

```bash
npm run build     # build the production site into dist/
npm run preview   # preview that build locally
```

---

## How content works

Right now all content lives as Markdown files in `src/content/`. Each folder
is a content type with a defined shape (see `src/content/config.ts`):

| Folder | What it holds |
| --- | --- |
| `events/` | Concerts, festivals, trips |
| `ensembles/` | The five orchestras |
| `news/` | Announcements |
| `pages/` | Static pages (About, Director, etc.) |

### The important idea: events are entered once

A single file in `src/content/events/` automatically drives:

- the **"Next up"** block on the homepage
- the **upcoming** list on `/calendar`
- the **past events** list on `/calendar` — an event moves here on its own
  once its date passes, so nobody ever has to maintain a "past events" page
- the **`/events.ics` feed** families subscribe to

### Adding a concert

Create a new file in `src/content/events/`, for example
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
`Symphony`, `Full Orchestra`.

Set `draft: true` to keep something unpublished.

---

## Roadmap

- [ ] **Phase 1 — content site.** Homepage, orchestras, calendar, about,
      student resources. Markdown-backed. _(in progress)_
- [ ] **Phase 2 — CMS.** Add Sanity Studio so the director edits in a
      browser instead of Markdown. The schemas in `src/content/config.ts`
      are shaped to map onto Sanity directly, so this swaps the data
      source, not the templates.
- [ ] **Phase 3 — deploy.** Cloudflare Pages or Netlify, then point the
      domain over.
- [ ] **Phase 4 — payments.** Not before the rest is stable. See below.

---

## Things to confirm before launch

- [x] **Prior playing experience is required** for Concert and Silver.
      (The old site's "Orchestra 101" page said otherwise — that copy was
      wrong and should not be carried over.)
- [x] **Chamber Orchestra is still running.** Included as the sixth
      ensemble. Still to confirm: current roster size, and whether Chamber
      members also play in Symphony.
- [ ] **Contact email.** The current site has no email address anywhere.
      Get one to publish — this is the biggest gap for people outside the
      school trying to reach the program.
- [ ] Replace the placeholder social links in `src/components/Footer.astro`
      with the real Instagram and YouTube URLs.
- [ ] Sample events in `src/content/events/` are placeholders. Swap in the
      real season calendar.

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
