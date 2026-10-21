import type { SupabaseClient } from '@supabase/supabase-js';
import { ASSETS } from '../lib/images';
import { sitePhotoUrl } from '../lib/supabase';
import { esc, toast, explain } from './client';

/* Choose a photo for a page section: one built into the site, one
   uploaded before, or a new upload. Returns the stored reference
   ("asset:hero" / "site:<file>"), or null if cancelled. */

/** Preview URL for a stored image reference. */
export function imageUrl(ref: string | undefined): string | null {
  if (!ref) return null;
  if (ref.startsWith('asset:')) return ASSETS[ref.slice(6)]?.src ?? null;
  if (ref.startsWith('site:')) return sitePhotoUrl(ref.slice(5));
  return null;
}

/** Shrink to at most 2000px on the long side, WebP. Keeps uploads small. */
async function prepare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/webp', 0.85));
}

let dialog: HTMLDialogElement | null = null;

export function pickImage(db: SupabaseClient): Promise<string | null> {
  return new Promise(async (resolve) => {
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'picker';
    dialog.innerHTML = `
      <form method="dialog" class="picker__head"><h2>Choose a photo</h2><button class="pbtn pbtn--ghost" value="cancel">Cancel</button></form>
      <label class="pbtn pbtn--primary picker__up">Upload a new photo<input type="file" accept="image/*" hidden /></label>
      <p class="hint" data-status>Only photos the program is cleared to publish. Large photos are shrunk before upload.</p>
      <h3>Uploaded</h3><div class="picker__grid" data-uploaded><p class="empty">Loading…</p></div>
      <h3>Built into the site</h3><div class="picker__grid">${Object.entries(ASSETS).map(([k, m]) =>
        `<button type="button" data-ref="asset:${esc(k)}"><img src="${esc(m.src)}" alt="" loading="lazy" /><span>${esc(k)}</span></button>`).join('')}</div>`;
    document.body.append(dialog);

    const done = (v: string | null) => { dialog!.close(); resolve(v); };
    dialog.addEventListener('close', () => resolve(null), { once: true });
    dialog.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ref]');
      if (b) done(b.dataset.ref!);
    });

    const status = dialog.querySelector<HTMLElement>('[data-status]')!;
    const input = dialog.querySelector<HTMLInputElement>('input[type=file]')!;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      status.textContent = 'Uploading…';
      try {
        const blob = await prepare(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await db.storage.from('site').upload(path, blob, { contentType: 'image/webp' });
        if (error) throw error;
        done(`site:${path}`);
      } catch (err: any) {
        status.textContent = err?.message === 'encode' ? 'That file couldn’t be read as an image.' : explain(err);
        toast(status.textContent!, 'error');
      }
    });

    dialog.showModal();

    const { data, error } = await db.storage.from('site').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    const grid = dialog.querySelector<HTMLElement>('[data-uploaded]')!;
    if (error) grid.innerHTML = `<p class="empty">${esc(explain(error))}</p>`;
    else {
      const files = (data ?? []).filter((f) => f.name && !f.name.startsWith('.'));
      grid.innerHTML = files.length
        ? files.map((f) => `<button type="button" data-ref="site:${esc(f.name)}"><img src="${esc(sitePhotoUrl(f.name))}" alt="" loading="lazy" /></button>`).join('')
        : '<p class="empty">Nothing uploaded yet.</p>';
    }
  });
}
