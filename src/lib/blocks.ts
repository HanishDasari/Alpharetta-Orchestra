/* ---------------------------------------------------------------
   Section types. Every page on the site is an ordered list of these,
   edited in the portal under Pages. Each type has a fixed layout that
   works on phones; editors fill in the words, links and images.

   Images are strings:
     "asset:hero"                     a photo built into the site
     "asset:memories/chicago-2024/001" (any file under src/assets)
     "site:1729…-ab12.webp"           a photo uploaded in the portal
   --------------------------------------------------------------- */

export type Tone = 'white' | 'light' | 'silver';
export interface Link { label: string; url: string }
export interface Card { kicker?: string; title: string; body?: string; url?: string; cta?: string }
export interface Item { title: string; detail?: string; url?: string }
export interface Qa { q: string; a: string }

export type Block =
  | { id: string; type: 'hero'; image: string }
  | { id: string; type: 'heading'; eyebrow?: string; title: string; lede?: string; tone?: Tone }
  | { id: string; type: 'text'; heading?: string; md: string; tone?: Tone }
  | { id: string; type: 'split'; heading?: string; md: string; image: string; flip?: boolean; button?: Link; tone?: Tone }
  | { id: string; type: 'image'; image: string; caption?: string; tone?: Tone }
  | { id: string; type: 'quote'; text: string; by?: string; tone?: Tone }
  | { id: string; type: 'buttons'; items: Link[]; tone?: Tone }
  | { id: string; type: 'cards'; heading?: string; items: Card[]; tone?: Tone }
  | { id: string; type: 'list'; heading?: string; intro?: string; items: Item[]; columns?: 1 | 2; tone?: Tone }
  | { id: string; type: 'events'; heading?: string; count?: number; tone?: Tone }
  | { id: string; type: 'calendar' }
  | { id: string; type: 'ring'; heading?: string; tone?: Tone }
  | { id: string; type: 'ensembles' }
  | { id: string; type: 'news'; count?: number }
  | { id: string; type: 'gallery'; heading?: string; md?: string; images: string[]; tone?: Tone }
  | { id: string; type: 'video'; heading?: string; md?: string; url: string; tone?: Tone }
  | { id: string; type: 'faq'; heading?: string; items: Qa[]; tone?: Tone };

export type BlockType = Block['type'];

/** What the editor shows when adding a section. Order = order in the picker. */
export const BLOCK_TYPES: { type: BlockType; name: string; hint: string }[] = [
  { type: 'heading', name: 'Page heading', hint: 'Title with an optional small label and intro line' },
  { type: 'text', name: 'Text', hint: 'Paragraphs, headings, bullet lists, links' },
  { type: 'split', name: 'Photo and text', hint: 'A photo beside text, with an optional button' },
  { type: 'image', name: 'Image', hint: 'One wide photo with an optional caption' },
  { type: 'gallery', name: 'Photo gallery', hint: 'A grid of photos that open full size when clicked' },
  { type: 'video', name: 'Video', hint: 'A YouTube video, with an optional heading and text' },
  { type: 'faq', name: 'Questions & answers', hint: 'Questions that open to show their answer' },
  { type: 'hero', name: 'Banner photo', hint: 'Full-width photo across the top of a page' },
  { type: 'quote', name: 'Quote', hint: 'A large quotation' },
  { type: 'buttons', name: 'Buttons', hint: 'One or more buttons in a row' },
  { type: 'cards', name: 'Cards', hint: 'A grid of boxes, each with a title, text and link' },
  { type: 'list', name: 'List', hint: 'Names with details and links, like the dealer list' },
  { type: 'events', name: 'Upcoming concerts', hint: 'The next few events, always current' },
  { type: 'calendar', name: 'Full calendar', hint: 'Upcoming and past events with the subscribe button' },
  { type: 'ring', name: 'Photo ring', hint: 'The spinning ring of photos (Photos in the portal)' },
  { type: 'ensembles', name: 'Orchestras', hint: 'Every ensemble (edited under Orchestras)' },
  { type: 'news', name: 'Announcements', hint: 'Posts from Announcements, newest first' },
];

export const TONES: { value: Tone; name: string }[] = [
  { value: 'white', name: 'White' },
  { value: 'light', name: 'Light grey' },
  { value: 'silver', name: 'Silver (white text)' },
];

/** A new, empty section of the given type. */
export function blankBlock(type: BlockType): Block {
  const id = Math.random().toString(36).slice(2, 10);
  switch (type) {
    case 'hero': return { id, type, image: '' };
    case 'heading': return { id, type, title: 'New heading' };
    case 'text': return { id, type, md: '' };
    case 'split': return { id, type, md: '', image: '' };
    case 'image': return { id, type, image: '' };
    case 'quote': return { id, type, text: '' };
    case 'buttons': return { id, type, items: [{ label: 'Learn more', url: '/' }] };
    case 'cards': return { id, type, items: [{ title: 'Card title' }] };
    case 'list': return { id, type, items: [{ title: 'Item' }] };
    case 'events': return { id, type, heading: 'Coming up', count: 3 };
    case 'calendar': return { id, type };
    case 'ring': return { id, type, heading: 'Orchestra Memories' };
    case 'ensembles': return { id, type };
    case 'news': return { id, type };
    case 'gallery': return { id, type, images: [] };
    case 'video': return { id, type, url: '' };
    case 'faq': return { id, type, items: [{ q: 'Question', a: '' }] };
  }
}

/** Header menu and footer. */
export interface NavConfig {
  header: Link[];
  footer: { name: string; address: string; email: string; about: Link[]; support: Link[] };
}

/** The YouTube video id in a watch, share, embed or Shorts link, or null. */
export function youtubeId(url: string | undefined): string | null {
  const m = (url ?? '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Pages whose address is fixed in the code. Custom pages can't use these. */
export const RESERVED_SLUGS = ['portal', 'events', 'events-ics', 'proposal', '404', 'api', '_astro'];
