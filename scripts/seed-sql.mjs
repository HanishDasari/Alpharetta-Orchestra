// Turns the Markdown in src/content/ into SQL that loads it into an
// empty Supabase project. Run once when setting the portal up:
//
//   npm run seed > seed.sql
//
// then paste seed.sql into Supabase > SQL Editor and run it. Rows that
// already exist are left alone, so running it twice is harmless.
// After this, edit content in the portal, not in the Markdown files.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const root = new URL('../src/content/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function read(dir) {
  return readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(root, dir, f), 'utf8').replace(/\r\n/g, '\n');
      const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      return { id: f.replace(/\.md$/, ''), data: parse(m[1]) ?? {}, body: m[2].trim() };
    });
}

const q = (v) => (v === undefined || v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 'true' : 'false');
const ts = (v) => (v instanceof Date ? q(v.toISOString()) : q(v));
const arr = (a = []) => `array[${a.map(q).join(', ')}]::text[]`;

const out = ['begin;'];

for (const e of read('events')) {
  const d = e.data;
  out.push(`insert into public.events (slug, title, start_at, end_at, all_day, location, address, ensembles, summary, body, link_label, link_url, featured, draft)
values (${q(e.id)}, ${q(d.title)}, ${ts(d.start)}, ${ts(d.end)}, ${b(d.allDay)}, ${q(d.location ?? 'Alpharetta High School')}, ${q(d.address)}, ${arr(d.ensembles)}, ${q(d.summary)}, ${q(e.body)}, ${q(d.link?.label)}, ${q(d.link?.url)}, ${b(d.featured)}, ${b(d.draft)})
on conflict (slug) do nothing;`);
}

for (const n of read('news')) {
  const d = n.data;
  const date = d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date;
  out.push(`insert into public.news (slug, title, date, author, summary, body, draft)
values (${q(n.id)}, ${q(d.title)}, ${q(date)}, ${q(d.author ?? 'AHS Orchestras')}, ${q(d.summary)}, ${q(n.body)}, ${b(d.draft)})
on conflict (slug) do nothing;`);
}

// Page sections and the menu (JSON in src/content/site/).
const siteDir = join(root, 'site');
for (const f of readdirSync(siteDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const p = JSON.parse(readFileSync(join(siteDir, f), 'utf8'));
  out.push(`insert into public.site_pages (slug, title, description, blocks, system)
values (${q(p.slug)}, ${q(p.title)}, ${q(p.description)}, ${q(JSON.stringify(p.blocks))}::jsonb, ${b(p.system)})
on conflict (slug) do nothing;`);
}
const nav = readFileSync(join(siteDir, '_nav.json'), 'utf8');
out.push(`update public.site_nav set nav = ${q(JSON.stringify(JSON.parse(nav)))}::jsonb where id = 1 and nav = '{}'::jsonb;`);

for (const e of read('ensembles')) {
  const d = e.data;
  out.push(`insert into public.ensembles (id, name, sort, period, grades, gmea_level, requirements, summary, body, draft)
values (${q(e.id)}, ${q(d.name)}, ${d.order ?? 0}, ${q(d.period)}, ${q(d.grades)}, ${q(d.gmeaLevel)}, ${q(d.requirements)}, ${q(d.summary)}, ${q(e.body)}, ${b(d.draft)})
on conflict (id) do nothing;`);
}

out.push('commit;');
console.log(out.join('\n\n'));
