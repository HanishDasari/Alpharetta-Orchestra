import { renderMarkdown } from '../lib/markdown';
import { esc } from './client';
import { imageUrl } from './imagePicker';

/* ---------------------------------------------------------------
   Slides for Presentations. One renderer is used for the editor's
   preview, the thumbnails, and full-screen presenting, so what the
   director edits is exactly what the class sees.

   Every slide is drawn on a 1600 x 900 stage and scaled to fit, the
   way Google Slides does, so text never reflows between the laptop
   and the projector.
   --------------------------------------------------------------- */

export type Layout = 'title' | 'text' | 'image' | 'split';

export interface Slide {
  id: string;
  layout: Layout;
  title?: string;
  md?: string;
  image?: string;
  notes?: string;
}

export const LAYOUTS: { value: Layout; name: string }[] = [
  { value: 'title', name: 'Title slide' },
  { value: 'text', name: 'Title and text' },
  { value: 'split', name: 'Text and photo' },
  { value: 'image', name: 'Big photo' },
];

export const newSlide = (layout: Layout = 'text'): Slide => ({
  id: Math.random().toString(36).slice(2, 10),
  layout,
  title: layout === 'title' ? 'Presentation title' : 'Slide title',
  md: layout === 'image' ? '' : layout === 'title' ? 'Subtitle' : '- First point\n- Second point',
});

/** The slide's HTML, for a 1600 x 900 stage. */
export function slideHtml(s: Slide): string {
  const title = s.title ? `<h2 class="sl__title">${esc(s.title)}</h2>` : '';
  const body = s.md ? `<div class="sl__body">${renderMarkdown(s.md)}</div>` : '';
  const src = imageUrl(s.image);
  const img = src ? `<img class="sl__img" src="${esc(src)}" alt="" />` : '<div class="sl__img sl__img--empty">No photo</div>';
  switch (s.layout) {
    case 'title':
      return `<div class="sl sl--title">${s.title ? `<h1 class="sl__title">${esc(s.title)}</h1>` : ''}${body}</div>`;
    case 'image':
      return `<div class="sl sl--image">${img}${s.title || s.md ? `<div class="sl__cap">${title}${body}</div>` : ''}</div>`;
    case 'split':
      return `<div class="sl sl--split"><div class="sl__col">${title}${body}</div>${img}</div>`;
    default:
      return `<div class="sl sl--text">${title}${body}</div>`;
  }
}

/** Scale every .stage inside `root` to fit its box. */
export function fitStages(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.stage').forEach((stage) => {
    const box = stage.parentElement!;
    const scale = Math.min(box.clientWidth / 1600, box.clientHeight / 900);
    stage.style.transform = `scale(${scale})`;
  });
}

/** Full-screen presenter: arrows, space, click to advance; Esc to leave. */
export function present(slides: Slide[], start = 0, title = 'Presentation') {
  if (!slides.length) return;
  let at = Math.max(0, Math.min(start, slides.length - 1));
  const shell = document.createElement('div');
  shell.className = 'presenter';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-label', title);
  shell.innerHTML = `
    <div class="presenter__box"><div class="stage"></div></div>
    <div class="presenter__bar">
      <button type="button" data-go="-1" aria-label="Previous slide">Previous</button>
      <span class="presenter__count" aria-live="polite"></span>
      <button type="button" data-go="1" aria-label="Next slide">Next</button>
      <button type="button" data-exit>Exit</button>
    </div>`;
  document.body.append(shell);
  const stage = shell.querySelector<HTMLElement>('.stage')!;
  const count = shell.querySelector<HTMLElement>('.presenter__count')!;

  const show = (i: number) => {
    at = Math.max(0, Math.min(i, slides.length - 1));
    stage.innerHTML = slideHtml(slides[at]);
    count.textContent = `${at + 1} / ${slides.length}`;
    fitStages(shell);
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    if (document.fullscreenElement) document.exitFullscreen();
    shell.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); show(at + 1); }
    if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); show(at - 1); }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(slides.length - 1);
    if (e.key === 'Escape') close();
  };
  const onResize = () => fitStages(shell);
  shell.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-exit]')) return close();
    const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go) return show(at + Number(go));
    if (t.closest('.presenter__box')) show(at + 1);
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && shell.isConnected) fitStages(shell); });
  shell.requestFullscreen?.().catch(() => { /* still works as an overlay */ });
  show(at);
}

/** Styles for slides and the presenter (portal pages include this once). */
export const SLIDE_CSS = `
  .stage { width: 1600px; height: 900px; transform-origin: top left; position: absolute; left: 0; top: 0; }
  .sl { width: 1600px; height: 900px; box-sizing: border-box; background: #fff; color: var(--ink); font-family: var(--font-body); overflow: hidden; position: relative; }
  .sl__title { font-family: var(--font-display); font-weight: 600; color: var(--ink); margin: 0 0 40px; line-height: 1.12; text-wrap: balance; }
  .sl__body { font-size: 44px; line-height: 1.45; }
  .sl__body ul, .sl__body ol { margin: 0; padding-left: 1.1em; }
  .sl__body li { margin-bottom: .35em; }
  .sl__body p { margin: 0 0 .5em; }
  .sl__body h2 { font-size: 1.1em; color: var(--maroon); margin: .6em 0 .2em; }
  .sl__body strong { color: var(--maroon); }
  .sl--title { display: flex; flex-direction: column; justify-content: center; padding: 120px 140px; background: var(--maroon); color: #fff; }
  .sl--title .sl__title { color: #fff; font-size: 104px; margin-bottom: 32px; }
  .sl--title .sl__body { color: rgb(255 255 255 / .85); font-size: 48px; }
  .sl--text { padding: 100px 120px; border-top: 18px solid var(--maroon); }
  .sl--text .sl__title { font-size: 76px; }
  .sl--split { display: grid; grid-template-columns: 1fr 1fr; border-top: 18px solid var(--maroon); }
  .sl--split .sl__col { padding: 90px 70px 90px 110px; }
  .sl--split .sl__title { font-size: 66px; }
  .sl--split .sl__body { font-size: 38px; }
  .sl__img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sl__img--empty { display: grid; place-items: center; background: #EEF0F2; color: #8A9096; font-size: 36px; }
  .sl--image .sl__img { position: absolute; inset: 0; }
  .sl--image .sl__cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 60px 90px 56px; background: linear-gradient(transparent, rgb(10 12 14 / .78)); color: #fff; }
  .sl--image .sl__title { color: #fff; font-size: 64px; margin: 0 0 8px; }
  .sl--image .sl__body { font-size: 34px; color: rgb(255 255 255 / .88); }

  .presenter { position: fixed; inset: 0; z-index: 100; background: #0B0C0E; display: grid; grid-template-rows: 1fr auto; }
  .presenter__box { position: relative; margin: 2vh auto 0; width: min(100vw, calc(94vh * 16 / 9)); aspect-ratio: 16 / 9; align-self: center; cursor: pointer; overflow: hidden; }
  .presenter__bar { display: flex; justify-content: center; align-items: center; gap: .75rem; padding: .6rem; opacity: .35; transition: opacity .2s ease; }
  .presenter:hover .presenter__bar, .presenter__bar:focus-within { opacity: 1; }
  .presenter__bar button { background: rgb(255 255 255 / .12); color: #fff; border: 0; border-radius: 6px; padding: .4rem .9rem; font: inherit; font-size: .85rem; cursor: pointer; }
  .presenter__bar button:hover { background: rgb(255 255 255 / .24); }
  .presenter__count { color: rgb(255 255 255 / .7); font-size: .85rem; min-width: 4.5rem; text-align: center; }
`;
