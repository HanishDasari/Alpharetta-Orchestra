/* ---------------------------------------------------------------
   Demo mode: try every portal without an account.

   The Sign in page has a button per role. Pressing one stores the role
   in this browser and the portal runs against the stand-in database
   below instead of Supabase. It understands the handful of query calls
   the portal pages make (select/insert/update/upsert/delete, eq, in,
   gte, order, limit, single...) and keeps its tables in localStorage.

   Nothing here touches the real database, and it can't: the stand-in
   has no network access. Real data stays behind real sign-in and Row
   Level Security. Exit demo (or clear site data) resets it.
   --------------------------------------------------------------- */

import type { Profile, Role } from './client';

const ROLE_KEY = 'ahs-demo-role';
const DB_KEY = 'ahs-demo-db-v1';

export function demoRole(): Role | null {
  try { return (localStorage.getItem(ROLE_KEY) as Role) || null; } catch { return null; }
}
export function startDemo(role: Role) {
  localStorage.setItem(ROLE_KEY, role);
}
export function exitDemo() {
  try { localStorage.removeItem(ROLE_KEY); localStorage.removeItem(DB_KEY); } catch { /* storage blocked */ }
}

// Sample data ---------------------------------------------------------

const id = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const dayOffset = (n: number) => {
  const d = new Date(`${today()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const DEMO_PEOPLE: Record<Role, Profile> = {
  admin: { id: 'demo-admin', role: 'admin', full_name: 'Jake Hood (demo)', email: 'director@demo.invalid' },
  webmaster: { id: 'demo-web', role: 'webmaster', full_name: 'Student Webmaster (demo)', email: 'webmaster@demo.invalid' },
  treasurer: { id: 'demo-treasurer', role: 'treasurer', full_name: 'Booster Treasurer (demo)', email: 'treasurer@demo.invalid' },
  student: { id: 'demo-student', role: 'student', full_name: 'Maya Chen (demo)', email: 'student@demo.invalid' },
  family: { id: 'demo-family', role: 'family', full_name: 'The Chen family (demo)', email: 'family@demo.invalid' },
};

function seed(): Record<string, any[]> {
  const s1 = id(), s2 = id(), s3 = id(), f1 = id(), f2 = id();
  const now = new Date().toISOString();
  return {
    profiles: Object.values(DEMO_PEOPLE).map((p) => ({ ...p, created_at: now })),
    students: [
      { id: s1, first_name: 'Maya', last_name: 'Chen', ensemble: 'Sinfonia', period: '3rd', grad_year: 2028, profile_id: 'demo-student', created_at: now },
      { id: s2, first_name: 'Theo', last_name: 'Ramirez', ensemble: 'Symphony', period: '4th', grad_year: 2027, profile_id: null, created_at: now },
      { id: s3, first_name: 'Priya', last_name: 'Natarajan', ensemble: 'Concert', period: '8th', grad_year: 2030, profile_id: null, created_at: now },
    ],
    guardians: [{ profile_id: 'demo-family', student_id: s1 }],
    events: [
      { id: id(), slug: 'winter-concert-2026', title: 'Winter Concert 2026', start_at: `${dayOffset(40)}T19:00:00-05:00`, end_at: `${dayOffset(40)}T21:00:00-05:00`, all_day: false,
        location: 'AHS Performing Arts Center', address: '3595 Webb Bridge Road, Alpharetta, GA 30005', ensembles: ['Concert', 'Silver', 'Philharmonia', 'Sinfonia', 'Symphony'],
        summary: 'Music that captures the joy of the holiday season.', body: 'Sample event in demo mode.', link_label: null, link_url: null, featured: false, draft: false, updated_at: now },
    ],
    news: [
      { id: id(), slug: 'welcome-demo', title: 'Welcome to the new portal', date: today(), author: 'AHS Orchestras', summary: null,
        body: 'This is **demo mode**. Try anything: changes stay in this browser only.', draft: false, updated_at: now },
    ],
    ensembles: [
      ['concert', 'Concert Orchestra', 1], ['silver', 'Silver Orchestra', 2], ['philharmonia', 'Philharmonia', 3],
      ['sinfonia', 'Sinfonia', 4], ['symphony', 'Symphony Orchestra', 5], ['chamber', 'Chamber Orchestra', 6],
    ].map(([eid, name, sort]) => ({ id: eid, name, sort, period: null, grades: null, gmea_level: null, requirements: null, summary: null, body: '', draft: false, updated_at: now })),
    site_pages: [],
    site_nav: [{ id: 1, nav: {} }],
    site_settings: [{ id: 1, settings: {} }],
    ring_photos: [],
    boards: [
      { id: id(), board_date: dayOffset(-1), title: 'Yesterday', published: true, updated_at: now,
        body: '## Warm-up\n- D major scale, 2 octaves\n\n## Rehearsal\n- Holst, St. Paul\'s Suite, mm. 1-40' },
      { id: id(), board_date: today(), title: 'Today', published: true, updated_at: now,
        body: '## Warm-up\n- G major, 3 octaves\n\n## Rehearsal\n- Sectionals, then full run of the Winter Concert set\n\n**Reminder:** permission slips due Friday' },
    ],
    forms: [
      { id: f1, title: 'Winter concert permission slip', description: 'Please confirm your student can attend the dress rehearsal after school.', audience: 'family', open: true,
        closes_on: dayOffset(14), created_at: now,
        fields: [{ id: 'a1', label: 'Student name', type: 'text', required: true }, { id: 'a2', label: 'My student may attend', type: 'checkbox', required: true }] },
      { id: f2, title: 'Chair placement preferences', description: '', audience: 'student', open: true, closes_on: null, created_at: now,
        fields: [{ id: 'b1', label: 'Section', type: 'choice', options: ['Violin I', 'Violin II', 'Viola', 'Cello', 'Bass'], required: true }, { id: 'b2', label: 'Anything Mr. Hood should know?', type: 'textarea', required: false }] },
    ],
    form_responses: [],
    presentations: [
      { id: id(), title: 'Welcome back: first rehearsal', shared: true, updated_at: now,
        slides: [
          { id: 's1', layout: 'title', title: 'Welcome back!', md: 'Alpharetta High School Orchestras, 2026-27' },
          { id: 's2', layout: 'text', title: 'This week', md: '- Seating auditions Thursday\n- Bring your folder and a pencil\n- Concert dress orders open Friday' },
          { id: 's3', layout: 'image', title: 'Last spring', md: 'Fine Arts Festival 2025', image: 'asset:memories/fine-arts-2025/001' },
        ] },
    ],
    charges: [],
    payments: [],
  };
}

function loadDb(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const fresh = seed();
  saveDb(fresh);
  return fresh;
}
function saveDb(db: Record<string, any[]>) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* full or blocked: keep in memory */ }
}

// Query builder ----------------------------------------------------------

type Filter = (row: any) => boolean;
const ERR = (message: string, code = 'DEMO') => ({ message, code, details: '', hint: '' });

const KEYS: Record<string, string[]> = {
  site_pages: ['slug'], site_nav: ['id'], site_settings: ['id'], ensembles: ['id'],
  boards: ['board_date'], guardians: ['profile_id', 'student_id'], form_responses: ['form_id', 'profile_id'],
};

class Query implements PromiseLike<any> {
  private filters: Filter[] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any = null;
  private conflict: string[] = [];
  private returning = false;
  private one: 'single' | 'maybe' | null = null;
  private countOpt = false;
  private headOnly = false;

  constructor(private table: string, private me: Profile) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true;
    if (opts?.count) this.countOpt = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(v: any) { this.mode = 'insert'; this.payload = v; return this; }
  update(v: any) { this.mode = 'update'; this.payload = v; return this; }
  upsert(v: any, opts?: { onConflict?: string }) {
    this.mode = 'upsert'; this.payload = v;
    this.conflict = opts?.onConflict ? opts.onConflict.split(',') : KEYS[this.table] ?? ['id'];
    return this;
  }
  delete() { this.mode = 'delete'; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  order(c: string, opts?: { ascending?: boolean }) { this.sorts.push({ col: c, asc: opts?.ascending !== false }); return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  /** What this demo role may read, roughly mirroring the real RLS. */
  private visible(row: any, db: Record<string, any[]>): boolean {
    const role = this.me.role;
    if (role === 'admin' && (this.table === 'charges' || this.table === 'payments')) return false;
    if (this.table === 'students') {
      if (role === 'family') return db.guardians.some((g) => g.profile_id === this.me.id && g.student_id === row.id);
      if (role === 'student') return row.profile_id === this.me.id;
      return role === 'admin' || role === 'treasurer';
    }
    if (this.table === 'form_responses' && role !== 'admin') return row.profile_id === this.me.id;
    return true;
  }

  private run(): { data: any; error: any; count?: number | null } {
    const db = loadDb();
    const rows: any[] = (db[this.table] ??= []);
    const stamp = (r: any) => ('updated_at' in r || ['events', 'news', 'boards', 'site_pages', 'ensembles', 'presentations'].includes(this.table)
      ? { ...r, updated_at: new Date().toISOString() } : r);

    let result: any[] = [];
    if (this.mode === 'select') {
      result = rows.filter((r) => this.visible(r, db) && this.filters.every((f) => f(r)));
    } else if (this.mode === 'insert' || this.mode === 'upsert') {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((v: any) => ({ ...v }));
      for (const v of items) {
        const keys = this.mode === 'upsert' ? this.conflict : KEYS[this.table] ?? ['id'];
        const existing = rows.find((r) => keys.every((k) => k in v && r[k] === v[k]));
        if (existing) {
          if (this.mode === 'insert') return { data: null, error: ERR('That already exists.', '23505') };
          Object.assign(existing, stamp(v));
          result.push(existing);
        } else {
          const row = stamp({ id: v.id ?? id(), created_at: new Date().toISOString(), ...v });
          rows.push(row);
          result.push(row);
        }
      }
    } else if (this.mode === 'update') {
      for (const r of rows) if (this.filters.every((f) => f(r))) { Object.assign(r, stamp(this.payload)); result.push(r); }
    } else if (this.mode === 'delete') {
      db[this.table] = rows.filter((r) => !this.filters.every((f) => f(r)));
      result = rows.filter((r) => this.filters.every((f) => f(r)));
    }
    if (this.mode !== 'select') saveDb(db);

    for (const s of [...this.sorts].reverse()) {
      result = [...result].sort((a, b) => (a[s.col] > b[s.col] ? 1 : a[s.col] < b[s.col] ? -1 : 0) * (s.asc ? 1 : -1));
    }
    const count = result.length;
    if (this.max !== null) result = result.slice(0, this.max);
    const copy = JSON.parse(JSON.stringify(result));

    if (this.headOnly) return { data: null, error: null, count };
    if (this.mode !== 'select' && !this.returning && !this.one) return { data: null, error: null };
    if (this.one) {
      if (copy.length === 0) return this.one === 'maybe' ? { data: null, error: null } : { data: null, error: ERR('Not found.', 'PGRST116') };
      return { data: copy[0], error: null };
    }
    return { data: copy, error: null, count: this.countOpt ? count : null };
  }

  then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, bad?: ((e: any) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

/** A stand-in for the Supabase client, scoped to one demo person. */
export function demoClient(me: Profile): any {
  const noUploads = { data: null, error: ERR('Photo uploads are turned off in demo mode. Everything else works.') };
  return {
    from: (table: string) => new Query(table, me),
    storage: {
      from: () => ({
        upload: async () => noUploads,
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => { exitDemo(); return { error: null }; },
    },
  };
}
