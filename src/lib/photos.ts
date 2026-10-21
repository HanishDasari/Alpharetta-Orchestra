import type { ImageMetadata } from 'astro';

import hero from '../assets/photos/hero.webp';
import intro from '../assets/photos/intro.webp';
import program from '../assets/photos/program.webp';
import orchestras from '../assets/photos/orchestras.webp';
import director from '../assets/photos/director.webp';

/* ---------------------------------------------------------------
   The program's own photos, self-hosted in src/assets/photos so they
   survive the Squarespace account being cancelled. Astro resizes and
   compresses them at build time.

   Names match where each photo sits on the homepage.
   --------------------------------------------------------------- */
export const photos = {
  /** Section 1 — full-bleed hero photo */
  hero,
  /** Section 2 — photo beside the intro copy */
  intro,
  /** Section 3 — the three alternating rows */
  program,
  orchestras,
  director,
} as const;

/* The photo ring on the homepage uses every image in
   src/assets/ring/. To change what's in the ring, add or remove files
   there; nothing else needs editing. Order is by file name, so prefix
   with 01-, 02-… to control it. Until that folder has photos, the ring
   falls back to the five above. */
const ringFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/ring/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

export const ringPhotos: ImageMetadata[] = Object.keys(ringFiles).length
  ? Object.keys(ringFiles).sort().map((k) => ringFiles[k].default)
  : Object.values(photos);
