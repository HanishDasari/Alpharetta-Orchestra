import type { ImageMetadata } from 'astro';
import { photos } from './photos';
import { sitePhotoUrl } from './supabase';

/* Section images are stored as short strings so they survive being
   saved as JSON:
     asset:hero        a photo built into the site (src/assets/photos)
     site:<file>.webp  a photo uploaded in the portal */

export const ASSETS = photos as Record<string, ImageMetadata>;

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
