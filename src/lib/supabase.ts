import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* The anon key is public by design: it's in every visitor's browser
   once the portal loads. What it can read or change is decided by Row
   Level Security in supabase/migrations, not by keeping it secret.
   The service role key must never appear here or anywhere under src/. */
const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Shared client, or null when the site is running without Supabase. */
export function supabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createClient(url!, anonKey!, {
    auth: {
      // Only the portal (in the browser) keeps a session; the build
      // reads public rows anonymously.
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  });
  return client;
}

/** Public URL of a file in the `ring` storage bucket. */
export function ringPhotoUrl(path: string): string {
  return `${url}/storage/v1/object/public/ring/${path}`;
}

/** Public URL of an image uploaded for a page section (`site` bucket). */
export function sitePhotoUrl(path: string): string {
  return `${url}/storage/v1/object/public/site/${path}`;
}
