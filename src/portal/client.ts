import type { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { demoRole, demoClient, exitDemo, DEMO_PEOPLE } from './demo';

/* ---------------------------------------------------------------
   Browser side of the portal. Every portal page is static HTML; this
   signs the user in, checks their role, and hands the page a client.

   The role check here only decides which screen to show. What a user
   can actually read or change is enforced by Row Level Security in
   the database, so a user who edits this code still gets nothing
   their role doesn't allow.

   Demo mode (the test buttons on Sign in) swaps in a stand-in database
   that lives in this browser; see ./demo.ts.
   --------------------------------------------------------------- */

export type Role = 'admin' | 'treasurer' | 'webmaster' | 'student' | 'family';

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
}

export interface Session {
  db: SupabaseClient;
  user: User;
  profile: Profile;
}

export const HOME: Record<Role, string> = {
  admin: '/portal/admin',
  treasurer: '/portal/treasurer',
  webmaster: '/portal/webmaster',
  student: '/portal/student',
  family: '/portal/family',
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Director',
  treasurer: 'Treasurer',
  webmaster: 'Webmaster',
  student: 'Student',
  family: 'Family',
};

let resolveReady: (s: Session) => void;
const readyPromise = new Promise<Session>((r) => (resolveReady = r));

/** Resolves once the layout has confirmed who is signed in. */
export function whenReady(): Promise<Session> {
  return readyPromise;
}

/** Called once by the portal layout. Redirects away if not allowed. */
export async function boot(allowed: Role[]): Promise<void> {
  const demo = demoRole();
  if (demo) {
    const profile = DEMO_PEOPLE[demo];
    // Director can view the student and family screens, same as for real.
    if (!allowed.includes(demo)) {
      location.replace(HOME[demo]);
      return;
    }
    document.body.dataset.demo = '';
    resolveReady({ db: demoClient(profile), user: { id: profile.id } as User, profile });
    return;
  }

  const db = supabase();
  if (!db) {
    document.body.dataset.state = 'offline';
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.replace(`/portal?next=${encodeURIComponent(location.pathname + location.search)}`);
    return;
  }

  const { data: profile, error } = await db
    .from('profiles').select('id, role, full_name, email').eq('id', session.user.id).single();
  if (error || !profile) {
    document.body.dataset.state = 'noprofile';
    return;
  }

  if (!allowed.includes(profile.role)) {
    location.replace(HOME[profile.role as Role]);
    return;
  }

  resolveReady({ db, user: session.user, profile: profile as Profile });
}

export async function signOut(): Promise<void> {
  if (demoRole()) exitDemo();
  else await supabase()?.auth.signOut();
  location.assign('/portal');
}

// Small helpers shared by the portal pages ------------------------

/** Escape text for insertion into innerHTML. */
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

const TZ = 'America/New_York';

export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(new Date(d));
}

/** A plain date column (2026-10-15) shown without time zone drift. */
export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(new Date(`${day}T00:00:00Z`));
}

/** Today's date at school, as YYYY-MM-DD. */
export function schoolToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Show a short status message in the page's live region. */
export function toast(message: string, kind: 'ok' | 'error' = 'ok'): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout((el as any)._t);
  (el as any)._t = setTimeout(() => (el.hidden = true), kind === 'error' ? 8000 : 3500);
}

/** Turn a Supabase error into something a teacher can act on. */
export function explain(error: { message?: string; code?: string } | null): string {
  if (!error) return '';
  if (error.code === '23505') return 'That name is already taken. Change the title or the web address and try again.';
  if (error.code === '42501' || /row-level security/i.test(error.message ?? '')) {
    return 'Your account isn’t allowed to do that. If you think it should be, ask the director.';
  }
  if (/fetch|network/i.test(error.message ?? '')) return 'Couldn’t reach the server. Check your connection and try again.';
  return error.message ?? 'Something went wrong. Try again.';
}

// Eastern-time date/time fields <-> database timestamps -------------

/** Minutes Eastern time is behind UTC at a given instant (240 or 300). */
function easternOffset(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((at.getTime() - asUtc) / 60000);
}

/** "2026-12-10" + "19:00" typed as Eastern time -> ISO timestamp. */
export function easternToIso(day: string, time: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  // Offset at the guessed instant, then once more in case that crossed a DST change.
  const first = new Date(guess.getTime() + easternOffset(guess) * 60000);
  return new Date(guess.getTime() + easternOffset(first) * 60000).toISOString();
}

/** ISO timestamp -> { day, time } as shown on a clock in Alpharetta. */
export function isoToEastern(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return { day, time };
}

/** All-day events are stored at midnight UTC so the date never shifts. */
export const dayToIso = (day: string) => `${day}T00:00:00Z`;
export const isoToDay = (iso: string) => iso.slice(0, 10);
