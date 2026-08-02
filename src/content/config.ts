import { defineCollection, z } from 'astro:content';

/* ---------------------------------------------------------------
   These schemas are deliberately shaped to match the Sanity schemas
   we'll add later. Content lives in local Markdown for now so the
   site runs with zero accounts; swapping the data source to Sanity
   later touches the page queries, not the templates.
   --------------------------------------------------------------- */

const ENSEMBLES = [
  'Concert',
  'Silver',
  'Philharmonia',
  'Sinfonia',
  'Symphony',
  'Full Orchestra',
] as const;

const events = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Single source of truth for the homepage, calendar, past events,
      // and the .ics feed. Past events are just events whose date passed.
      start: z.date(),
      end: z.date().optional(),
      allDay: z.boolean().default(false),
      location: z.string().default('Alpharetta High School'),
      // Free-form so it can hold "Fine Arts Center" etc. without a code change
      address: z.string().optional(),
      ensembles: z.array(z.enum(ENSEMBLES)).default([]),
      summary: z.string().max(200).optional(),
      cover: image().optional(),
      gallery: z.array(image()).default([]),
      // e.g. a ticket page or an external info link
      link: z.object({ label: z.string(), url: z.string().url() }).optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const ensembles = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    order: z.number(), // controls display order, Concert -> Symphony
    period: z.string().optional(),
    grades: z.string().optional(),
    gmeaLevel: z.string().optional(),
    requirements: z.string().optional(),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().default('AHS Orchestras'),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { events, ensembles, news, pages };
