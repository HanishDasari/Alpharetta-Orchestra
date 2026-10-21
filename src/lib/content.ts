import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { renderMarkdown } from './markdown';
import { supabase } from './supabase';

/* ---------------------------------------------------------------
   Where the public site's content comes from.

   With Supabase configured (PUBLIC_SUPABASE_URL in .env), the
   database is the source of truth: it's what the director and
   webmaster edit in the portal, and the site rebuilds when it
   changes. Without it, the site reads the Markdown files in
   src/content/, so it still builds with zero accounts.

   `npm run seed` copies the Markdown into an empty database once.
   After that, edit in the portal, not in the files.
   --------------------------------------------------------------- */

const db = supabase();

const md = renderMarkdown;

async function rows<T>(table: string, order: string): Promise<T[]> {
  const { data, error } = await db!.from(table).select('*').order(order);
  // Fail the build loudly rather than publish a site with no content.
  if (error) throw new Error(`Supabase: couldn't read ${table}: ${error.message}`);
  return data as T[];
}

// Events ----------------------------------------------------------

export interface SiteEvent {
  slug: string;
  data: {
    title: string;
    start: Date;
    end?: Date;
    allDay: boolean;
    location: string;
    address?: string;
    ensembles: string[];
    summary?: string;
    link?: { label: string; url: string };
    featured: boolean;
    gallery: ImageMetadata[];
  };
  html: string;
}

let eventsPromise: Promise<SiteEvent[]> | null = null;

/** Every published event, oldest first. */
export function getEvents(): Promise<SiteEvent[]> {
  eventsPromise ??= (async () => {
    let list: SiteEvent[];
    if (db) {
      const data = await rows<any>('events', 'start_at');
      list = data.map((r) => ({
        slug: r.slug,
        data: {
          title: r.title,
          start: new Date(r.start_at),
          end: r.end_at ? new Date(r.end_at) : undefined,
          allDay: r.all_day,
          location: r.location,
          address: r.address ?? undefined,
          ensembles: r.ensembles ?? [],
          summary: r.summary ?? undefined,
          link: r.link_url ? { label: r.link_label || 'More info', url: r.link_url } : undefined,
          featured: r.featured,
          gallery: [],
        },
        html: md(r.body),
      }));
    } else {
      const entries = await getCollection('events', ({ data }) => !data.draft);
      list = entries.map((e) => ({
        slug: e.slug,
        data: { ...e.data, gallery: e.data.gallery ?? [] },
        html: md(e.body),
      }));
    }
    return list.sort((a, b) => a.data.start.getTime() - b.data.start.getTime());
  })();
  return eventsPromise;
}

// News ------------------------------------------------------------

export interface SiteNews {
  slug: string;
  title: string;
  date: Date;
  author: string;
  summary?: string;
  html: string;
}

/** Published announcements, newest first. */
export async function getNews(): Promise<SiteNews[]> {
  let list: SiteNews[];
  if (db) {
    const data = await rows<any>('news', 'date');
    list = data.map((r) => ({
      slug: r.slug, title: r.title, date: new Date(`${r.date}T12:00:00`),
      author: r.author, summary: r.summary ?? undefined, html: md(r.body),
    }));
  } else {
    const entries = await getCollection('news', ({ data }) => !data.draft);
    list = entries.map((e) => ({ slug: e.slug, ...e.data, html: md(e.body) }));
  }
  return list.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Pages -----------------------------------------------------------

export interface SitePage {
  id: string;
  title: string;
  description?: string;
  html: string;
}

export async function getPage(id: string): Promise<SitePage> {
  if (db) {
    const { data, error } = await db.from('pages').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase: couldn't read page ${id}: ${error.message}`);
    if (data) return { id, title: data.title, description: data.description ?? undefined, html: md(data.body) };
  }
  // Not in the database (or no database): fall back to the file.
  const [entry] = await getCollection('pages', (e) => e.slug === id);
  if (!entry) throw new Error(`No page called "${id}" in Supabase or src/content/pages`);
  return { id, title: entry.data.title, description: entry.data.description, html: md(entry.body) };
}

// Ensembles -------------------------------------------------------

export interface SiteEnsemble {
  id: string;
  name: string;
  period?: string;
  grades?: string;
  gmeaLevel?: string;
  requirements?: string;
  summary?: string;
  html: string;
}

export async function getEnsembles(): Promise<SiteEnsemble[]> {
  if (db) {
    const data = await rows<any>('ensembles', 'sort');
    return data.map((r) => ({
      id: r.id, name: r.name, period: r.period ?? undefined, grades: r.grades ?? undefined,
      gmeaLevel: r.gmea_level ?? undefined, requirements: r.requirements ?? undefined,
      summary: r.summary ?? undefined, html: md(r.body),
    }));
  }
  const entries = (await getCollection('ensembles', ({ data }) => !data.draft))
    .sort((a, b) => a.data.order - b.data.order);
  return entries.map((e) => ({ id: e.slug, ...e.data, html: md(e.body) }));
}

// Ring photos -----------------------------------------------------

/** Storage paths of the uploaded ring photos, in order. Empty without Supabase. */
export async function getRingPhotoPaths(): Promise<string[]> {
  if (!db) return [];
  const data = await rows<{ path: string }>('ring_photos', 'sort');
  return data.map((r) => r.path);
}

// Design settings -------------------------------------------------

export interface SiteSettings {
  colors?: { maroon?: string; maroonBright?: string; ink?: string };
  fontDisplay?: string;
  fontBody?: string;
  headerSize?: 'regular' | 'compact';
  sections?: { next?: boolean; memories?: boolean; quote?: boolean };
}

let settingsPromise: Promise<SiteSettings> | null = null;

export function getSettings(): Promise<SiteSettings> {
  settingsPromise ??= (async () => {
    if (!db) return {};
    const { data, error } = await db.from('site_settings').select('settings').eq('id', 1).maybeSingle();
    if (error) throw new Error(`Supabase: couldn't read site_settings: ${error.message}`);
    return (data?.settings ?? {}) as SiteSettings;
  })();
  return settingsPromise;
}
