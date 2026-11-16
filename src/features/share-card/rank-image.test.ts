import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type * as NextOg from 'next/og';
vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({ user: true, role: 'player', crown: false, fail: false, real: false,
  locale: 'en', name: 'Ahmed Private', tier: 'champion', captain: 'Coach Name', medalsFail: false }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: 'self' } : null }, error: null }) },
  from: (table: string) => {
    let id = '';
    const query = { select: () => query, eq: (key: string, value: string) => { if (key === 'id') id = value; return query; }, is: () => query,
      maybeSingle: async () => ({ data: table === 'coach_clients' ? { captain_id: 'coach' }
        : { role: state.role, full_name: id === 'coach' ? state.captain : state.name }, error: null }) };
    return query;
  },
  rpc: async (name: string) => ({ data: name === 'my_points' ? { tier: state.tier, lifetime: ({ beginner: 0, champion: 100, elite: 300, iron: 0, bronze: 100, silver: 200, gold: 300, platinum: 400, diamond: 600, legend: 900 } as Record<string,number>)[state.tier] }
    : name === 'my_medals' ? [{ workouts: 42 }] : [{ player_id: 'self', is_crown: state.crown }, { player_id: null, is_crown: true }],
    error: state.fail || (name === 'my_medals' && state.medalsFail) ? new Error('failed') : null }),
}) }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => state.locale }));
vi.mock('./data/og-font', () => ({ ogFont: async () => {
  const { readFileSync } = await import('node:fs');
  return Uint8Array.from(readFileSync(process.env.KOCHIVO_SAMPLE_FONT ?? 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')).buffer;
} }));
vi.mock('next/og', async importOriginal => {
  const actual = await importOriginal<typeof NextOg>();
  return { ImageResponse: class extends Response {
  constructor(element: ReactElement, options: { width: number; height: number; headers: Record<string, string> }) {
    super(JSON.stringify({ html: renderToStaticMarkup(element), ...options }), {
      headers: { ...options.headers, 'Content-Type': 'image/png' },
    });
    if (state.real) return new actual.ImageResponse(element, options);
  }
} };
});
import { GET } from '@/app/[locale]/api/share/rank/route';

// These cases cover the live route; the hidden-ranks case stubs its own value.
vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '1');

beforeEach(() => {
  state.user = true; state.role = 'player'; state.crown = false; state.fail = false; state.real = false;
  state.locale = 'en'; state.name = 'Ahmed Private'; state.tier = 'champion';
  state.captain = 'Coach Name'; state.medalsFail = false;
});
const request = (query = '') => new Request(`https://kochivo.test/api/share/rank${query}`);
it('rejects anonymous callers and captains', async () => {
  state.user = false;
  expect((await GET(request())).status).toBe(401);
  state.user = true; state.role = 'captain';
  expect((await GET(request())).status).toBe(401);
});
it('requires the current crown and rejects identity parameters', async () => {
  expect((await GET(request('?kind=crown'))).status).toBe(404);
  expect((await GET(request('?id=other'))).status).toBe(400);
  expect((await GET(request('?kind=other'))).status).toBe(400);
});
it.each(['rank', 'crown'])('returns a private story PNG for %s', async kind => {
  state.crown = true;
  const response = await GET(request(`?kind=${kind}`));
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('image/png');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  const result = await response.json();
  expect(result.width).toBe(1080); expect(result.height).toBe(1920);
  expect(result.html).toContain(kind === 'rank' ? '>New</div><div>rank</div>' : '>Monthly</div><div>crown</div>');
  expect(result.html).toContain('>Ahmed</div>');
  expect(result.html).toContain(kind === 'rank' ? '>Bronze</div>' : '>took this month’s crown</div>');
  expect(result.html).toContain('>100</div>');
  expect(result.html).toContain('>points</div>');
  expect(result.html).toContain('>42</div>');
  expect(result.html).toContain('>workouts</div>');
  expect(result.html).toMatch(/<svg[^>]*width="780"/);
  expect(result.html).toContain('data:image/png;base64,');
  expect(result.html).toContain('KOCHIVO');
  expect(result.html).toContain('>With</div><div>Captain</div>');
  expect(result.html).toContain('>Coach</div><div>Name</div>');
  expect(result.html).not.toContain('Private');
  expect(result.html).not.toContain('Lifetime');
});
it('does not render when a data dependency fails', async () => {
  state.fail = true;
  expect((await GET(request())).status).toBe(500);
});
it('renders a deterministic explosion and a compact extruded legend title', async () => {
  state.locale = 'ar'; state.tier = 'legend';
  const first = await (await GET(request())).json();
  const second = await (await GET(request())).json();
  expect(first.html).toContain('id="rank-burst"');
  expect(first.html).toBe(second.html);
  expect(first.html).toContain('font-size:195px');
  expect(first.html).toContain('background-clip:text');
  expect(first.html).toContain('KOCHIVO.SITE');
  expect(first.html).toContain('>جديدة</div><div>رتبة</div>');
});
it('uses the Arabic word-order fix and keeps only the first name', async () => {
  state.locale = 'ar'; state.name = 'أحمد سري';
  const result = await (await GET(request())).json();
  expect(result.html).toContain('<div>جديدة</div><div>رتبة</div>');
  expect(result.html).toContain('flex-direction:row-reverse');
  expect(result.html).toContain('>برونز</div>');
  expect(result.html).toContain('>أحمد</div>');
  expect(result.html).not.toContain('سري');
});
it('omits an empty captain and tolerates unavailable workouts', async () => {
  state.captain = ''; state.medalsFail = true;
  const response = await GET(request());
  expect(response.status).toBe(200);
  const { html } = await response.json();
  expect(html).not.toContain('Captain');
  expect(html).not.toContain('workouts');
  expect(html).toContain('>100</div>');
});
it.each(['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend', 'crown', 'gold-en'])('renders a real %s PNG without network access', async sample => {
  const tier = sample === 'gold-en' ? 'gold' : sample;
  state.locale = process.env.KOCHIVO_SHARE_SAMPLES && sample !== 'gold-en' ? 'ar' : 'en';
  const kind = tier === 'crown' ? 'crown' : 'rank';
  state.tier = tier === 'crown' ? 'legend' : tier;
  state.real = true; state.crown = true;
  const response = await GET(request(`?kind=${kind}`));
  expect(response.status).toBe(200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  expect(view.getUint32(16)).toBe(1080); expect(view.getUint32(20)).toBe(1920);
  if (process.env.KOCHIVO_SHARE_SAMPLES && ['iron', 'gold', 'legend'].includes(tier)) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const folder = join(tmpdir(), 'kochivo-t321b');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, `${tier}-${state.locale}.png`), bytes);
  }
});

it('answers 404 without reading anything while ranks are hidden', async () => {
  vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '');
  try {
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  } finally {
    vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '1');
  }
});
