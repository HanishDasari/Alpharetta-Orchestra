import type { BlockType } from '../lib/blocks';
import { TONES } from '../lib/blocks';

/* ---------------------------------------------------------------
   The form for each section type, as data. The page builder and the
   menu editor render these with renderFields(), so adding a field to a
   section type is one line here plus its use in Blocks.astro.
   --------------------------------------------------------------- */

export type Field =
  | { key: string; label: string; kind: 'text' | 'url'; hint?: string; placeholder?: string }
  | { key: string; label: string; kind: 'textarea' | 'md'; hint?: string; rows?: number }
  | { key: string; label: string; kind: 'image'; hint?: string }
  | { key: string; label: string; kind: 'images'; hint?: string }
  | { key: string; label: string; kind: 'check'; hint?: string }
  | { key: string; label: string; kind: 'number'; min: number; max: number; hint?: string }
  | { key: string; label: string; kind: 'select'; options: { value: string; name: string }[]; hint?: string }
  | { key: string; label: string; kind: 'link'; hint?: string }
  | { key: string; label: string; kind: 'repeat'; item: string; fields: Field[]; hint?: string };

const tone: Field = { key: 'tone', label: 'Background', kind: 'select', options: TONES };
const MD_HINT = 'Blank line between paragraphs. **bold**, ## heading, - bullet, [text](https://link).';

export const BLOCK_FIELDS: Record<BlockType, { note?: string; fields: Field[] }> = {
  hero: { fields: [{ key: 'image', label: 'Photo', kind: 'image', hint: 'Shown full width; wide photos work best.' }] },
  heading: {
    fields: [
      { key: 'eyebrow', label: 'Small label above (optional)', kind: 'text' },
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'lede', label: 'Intro line (optional)', kind: 'textarea', rows: 3 },
      tone,
    ],
  },
  text: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'md', label: 'Text', kind: 'md', rows: 10, hint: MD_HINT },
      tone,
    ],
  },
  split: {
    fields: [
      { key: 'image', label: 'Photo', kind: 'image' },
      { key: 'flip', label: 'Photo on the right', kind: 'check' },
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'md', label: 'Text', kind: 'md', rows: 6, hint: MD_HINT },
      { key: 'button', label: 'Button (optional)', kind: 'link' },
      tone,
    ],
  },
  image: {
    fields: [
      { key: 'image', label: 'Photo', kind: 'image' },
      { key: 'caption', label: 'Caption (optional)', kind: 'text' },
      tone,
    ],
  },
  quote: {
    fields: [
      { key: 'text', label: 'Quote', kind: 'textarea', rows: 3, hint: 'Without quotation marks; they’re added for you.' },
      { key: 'by', label: 'Who said it', kind: 'text' },
      tone,
    ],
  },
  buttons: {
    fields: [
      { key: 'items', label: 'Buttons', kind: 'repeat', item: 'button', hint: 'The first one is filled in; the rest are outlined.',
        fields: [{ key: 'label', label: 'Text', kind: 'text' }, { key: 'url', label: 'Link', kind: 'url' }] },
      tone,
    ],
  },
  cards: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'items', label: 'Cards', kind: 'repeat', item: 'card', fields: [
        { key: 'kicker', label: 'Small label (optional)', kind: 'text', placeholder: '$195' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'body', label: 'Text', kind: 'md', rows: 3 },
        { key: 'url', label: 'Link (optional)', kind: 'url' },
        { key: 'cta', label: 'Link text (optional)', kind: 'text', placeholder: 'Leave blank to make the whole card clickable' },
      ] },
      tone,
    ],
  },
  list: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'intro', label: 'Intro (optional)', kind: 'md', rows: 2 },
      { key: 'columns', label: 'Layout', kind: 'select', options: [{ value: '1', name: 'One column' }, { value: '2', name: 'Two columns' }] },
      { key: 'items', label: 'Items', kind: 'repeat', item: 'item', fields: [
        { key: 'title', label: 'Name', kind: 'text' },
        { key: 'detail', label: 'Details (optional)', kind: 'text' },
        { key: 'url', label: 'Link (optional)', kind: 'url' },
      ] },
      tone,
    ],
  },
  events: {
    note: 'Fills itself from Concerts & Events.',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'count', label: 'How many to show', kind: 'number', min: 1, max: 12 },
      tone,
    ],
  },
  calendar: { note: 'Upcoming and past events with the Subscribe button. Fills itself from Concerts & Events.', fields: [] },
  ring: { note: 'The photos come from Photos in the portal.', fields: [{ key: 'heading', label: 'Heading (optional)', kind: 'text' }, tone] },
  ensembles: { note: 'All six ensembles. Edit them under Orchestras.', fields: [] },
  news: { note: 'Posts from Announcements, newest first.', fields: [{ key: 'count', label: 'How many to show (blank for all)', kind: 'number', min: 1, max: 50 }] },
  gallery: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'md', label: 'Text above the photos (optional)', kind: 'md', rows: 3 },
      { key: 'images', label: 'Photos', kind: 'images', hint: 'Shown in this order. Visitors click a photo to see it full size.' },
      tone,
    ],
  },
  video: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'md', label: 'Text above the video (optional)', kind: 'md', rows: 3 },
      { key: 'url', label: 'YouTube link', kind: 'url', hint: 'Paste the link from YouTube’s Share button.' },
      tone,
    ],
  },
  faq: {
    fields: [
      { key: 'heading', label: 'Heading (optional)', kind: 'text' },
      { key: 'items', label: 'Questions', kind: 'repeat', item: 'question', fields: [
        { key: 'q', label: 'Question', kind: 'text' },
        { key: 'a', label: 'Answer', kind: 'md', rows: 4 },
      ] },
      tone,
    ],
  },
};

// Rendering ---------------------------------------------------------

const escAttr = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let uid = 0;

/** Render fields for `obj`. Inputs carry data-path="a.b.0.c" relative to `prefix`. */
export function renderFields(fields: Field[], obj: any, prefix: string): string {
  return fields.map((f) => {
    const path = prefix ? `${prefix}.${f.key}` : f.key;
    const v = obj?.[f.key];
    const id = `f${++uid}`;
    const hint = f.hint ? `<p class="hint">${escAttr(f.hint)}</p>` : '';
    switch (f.kind) {
      case 'text':
      case 'url':
        return `<div class="fld"><label for="${id}">${escAttr(f.label)}</label>
          <input class="inp" id="${id}" data-path="${path}" value="${escAttr(v)}" ${f.kind === 'url' ? 'list="site-links" placeholder="/page or https://…"' : `placeholder="${escAttr(f.placeholder ?? '')}"`} />${hint}</div>`;
      case 'textarea':
      case 'md':
        return `<div class="fld"><label for="${id}">${escAttr(f.label)}</label>
          <textarea class="inp inp--area${f.kind === 'md' ? ' inp--md' : ''}" id="${id}" data-path="${path}" rows="${f.rows ?? 4}">${escAttr(v)}</textarea>${hint}</div>`;
      case 'check':
        return `<div class="fld"><label class="check"><input type="checkbox" data-path="${path}" data-kind="check" ${v ? 'checked' : ''} /> ${escAttr(f.label)}</label>${hint}</div>`;
      case 'number':
        return `<div class="fld"><label for="${id}">${escAttr(f.label)}</label>
          <input class="inp inp--num" id="${id}" type="number" min="${f.min}" max="${f.max}" data-path="${path}" data-kind="number" value="${escAttr(v)}" />${hint}</div>`;
      case 'select':
        return `<div class="fld"><label for="${id}">${escAttr(f.label)}</label>
          <select class="inp" id="${id}" data-path="${path}" ${f.key === 'columns' ? 'data-kind="number"' : ''}>
          ${f.options.map((o) => `<option value="${escAttr(o.value)}" ${String(v ?? f.options[0].value) === o.value ? 'selected' : ''}>${escAttr(o.name)}</option>`).join('')}
          </select>${hint}</div>`;
      case 'link':
        return `<fieldset class="fld"><legend>${escAttr(f.label)}</legend><div class="row2">
          <input class="inp" data-path="${path}.label" value="${escAttr(v?.label)}" placeholder="Button text" aria-label="Button text" />
          <input class="inp" data-path="${path}.url" value="${escAttr(v?.url)}" list="site-links" placeholder="/page or https://…" aria-label="Button link" />
          </div>${hint}</fieldset>`;
      case 'image':
        return `<div class="fld"><span class="lbl">${escAttr(f.label)}</span>
          <div class="imgfld" data-image="${path}"><img alt="" data-preview /><span class="imgfld__empty">No photo yet</span>
          <button type="button" class="pbtn pbtn--ghost" data-act="pick-image" data-path="${path}">Choose photo</button></div>${hint}</div>`;
      case 'images': {
        const refs: string[] = Array.isArray(v) ? v : [];
        return `<fieldset class="fld"><legend>${escAttr(f.label)} (${refs.length})</legend>${hint}
          <ul class="thumbs">${refs.map((r, i) => `<li><img alt="" data-ref="${escAttr(r)}" loading="lazy" />
            <span class="thumbs__ctl">
              <button type="button" data-act="img-move" data-path="${path}" data-i="${i}" data-step="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">&lt;</button>
              <button type="button" data-act="img-move" data-path="${path}" data-i="${i}" data-step="1" ${i === refs.length - 1 ? 'disabled' : ''} aria-label="Move later">&gt;</button>
              <button type="button" data-act="img-rm" data-path="${path}" data-i="${i}" class="danger" aria-label="Remove photo">Remove</button>
            </span></li>`).join('')}</ul>
          <button type="button" class="pbtn pbtn--ghost" data-act="img-add" data-path="${path}">Add a photo</button></fieldset>`;
      }
      case 'repeat': {
        const items: any[] = Array.isArray(v) ? v : [];
        return `<fieldset class="fld rep"><legend>${escAttr(f.label)}</legend>${hint}
          <ol class="rep__list">${items.map((it, i) => `<li class="rep__item">
            <div class="rep__bar"><b>${escAttr(f.item)} ${i + 1}</b><span class="spacer"></span>
              <button type="button" data-act="rep-up" data-path="${path}" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">Up</button>
              <button type="button" data-act="rep-down" data-path="${path}" data-i="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">Down</button>
              <button type="button" data-act="rep-rm" data-path="${path}" data-i="${i}" class="danger">Remove</button></div>
            ${renderFields(f.fields, it, `${path}.${i}`)}</li>`).join('')}</ol>
          <button type="button" class="pbtn pbtn--ghost" data-act="rep-add" data-path="${path}">Add ${escAttr(f.item)}</button></fieldset>`;
      }
    }
  }).join('');
}

// Paths ---------------------------------------------------------------

export function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  });
  const last = keys[keys.length - 1];
  if (value === '' || value === undefined) delete o[last];
  else o[last] = value;
}

/** Read an input's value into obj at its data-path. */
export function bindInput(obj: any, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, prefixLen = 0): void {
  const path = el.dataset.path!.split('.').slice(prefixLen).join('.');
  const kind = el.dataset.kind;
  if (kind === 'check') setPath(obj, path, (el as HTMLInputElement).checked || undefined);
  else if (kind === 'number') setPath(obj, path, el.value === '' ? undefined : Number(el.value));
  else setPath(obj, path, el.value);
}
