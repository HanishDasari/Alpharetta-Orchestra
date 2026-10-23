import type { ImageMetadata } from 'astro';
import { sitePhotoUrl } from './supabase';

/* Section images are stored as short strings so they survive being
   saved as JSON:
     asset:hero                       a photo in src/assets/photos
     asset:memories/chicago-2024/001  a photo in src/assets/memories
     site:<file>.webp                 a photo uploaded in the portal */

const files = import.meta.glob<ImageMetadata>(
  '../assets/{photos,memories}/**/*.{jpg,jpeg,png,webp}',
  { eager: true, import: 'default' },
);

/** Every built-in photo by its key: "hero", "memories/high-museum/003"… */
export const ASSETS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files)
    .map(([path, meta]) => [path.replace('../assets/', '').replace(/^photos\//, '').replace(/\.\w+$/, ''), meta] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);

/** Keys of the photos in one Memories album, in page order. */
export function albumKeys(album: string): string[] {
  return Object.keys(ASSETS).filter((k) => k.startsWith(`memories/${album}/`));
}

export type ResolvedImage =
  | { kind: 'asset'; meta: ImageMetadata }
  | { kind: 'url'; src: string };

export function resolveImage(ref: string | undefined): ResolvedImage | null {
  if (!ref) return null;
  if (ref.startsWith('asset:')) {
    const meta = ASSETS[ref.slice(6)];
    return meta ? { kind: 'asset', meta } : null;
  }
  if (ref.startsWith('site:')) return { kind: 'url', src: sitePhotoUrl(ref.slice(5)) };
  return null;
}
