import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import type * as NextOg from 'next/og';

const state = vi.hoisted(() => ({ user: true, role: 'player', crown: false, fail: false, real: false,
  locale: 'en', name: 'Ahmed Private', tier: 'champion' }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: 'self' } : null }, error: null }) },
  from: (table: string) => {
    let id = '';
    const query = { select: () => query, eq: (key: string, value: string) => { if (key === 'id') id = value; return query; }, is: () => query,
      maybeSingle: async () => ({ data: table === 'coach_clients' ? { captain_id: 'coach' }
        : { role: state.role, full_name: id === 'coach' ? 'Coach Name' : state.name }, error: null }) };
    return query;
  },
  rpc: async (name: string) => ({ data: name === 'my_points' ? { tier: state.tier }
    : [{ player_id: 'self', is_crown: state.crown }, { player_id: null, is_crown: true }],
    error: state.fail ? new Error('failed') : null }),
}) }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => state.locale }));
vi.mock('./data/og-font', () => ({ ogFont: async () => {
  const { readFileSync } = await import('node:fs');
  return Uint8Array.from(readFileSync('node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')).buffer;
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

beforeEach(() => {
  state.user = true; state.role = 'player'; state.crown = false; state.fail = false; state.real = false;
  state.locale = 'en'; state.name = 'Ahmed Private'; state.tier = 'champion';
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
  expect(result.html).toContain(kind === 'rank' ? 'Ahmed reached Champion' : 'Ahmed took this month');
  expect(result.html).toContain('KOCHIVO');
  expect(result.html).toContain('Captain Coach Name');
  expect(result.html).not.toContain('Private');
  expect(result.html).not.toContain('Lifetime');
});
it('does not render when a data dependency fails', async () => {
  state.fail = true;
  expect((await GET(request())).status).toBe(500);
});
it('uses the Arabic word-order fix and keeps only the first name', async () => {
  state.locale = 'ar'; state.name = 'أحمد سري';
  const result = await (await GET(request())).json();
  expect(result.html).toContain('بطل بقى أحمد');
  expect(result.html).not.toContain('سري');
});
it.each(['beginner', 'champion', 'elite', 'legend', 'crown'])('renders a real %s PNG without network access', async tier => {
  const kind = tier === 'crown' ? 'crown' : 'rank';
  state.tier = tier === 'crown' ? 'legend' : tier;
  state.real = true; state.crown = true;
  const response = await GET(request(`?kind=${kind}`));
  expect(response.status).toBe(200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  expect(view.getUint32(16)).toBe(1080); expect(view.getUint32(20)).toBe(1920);
});
