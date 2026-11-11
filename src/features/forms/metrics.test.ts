import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { loadMetrics, monthPeriod } from './data/metrics';

it('uses SQL counts for the sent cohort, including pending and reviewed answers, scoped by captain and form', async () => {
  const db = new PGlite();
  await db.exec(`create table form_requests (id serial, captain_id text, form_id text, player_id text, sent_at timestamptz, answered_at timestamptz);
    insert into form_requests (captain_id,form_id,player_id,sent_at,answered_at) values
    ('a','f','p1','2026-10-31 22:00Z','2026-11-01 00:00Z'),
    ('a','f','p1','2026-11-02 00:00Z',null),
    ('a','f','p2','2026-11-03 00:00Z','2026-12-01 00:00Z'),
    ('a','other','p3','2026-11-03 00:00Z',null),
    ('b','f','p4','2026-11-03 00:00Z','2026-11-03 01:00Z'),
    ('a','f','p5','2026-10-31 21:59Z','2026-11-01 00:00Z'),
    ('a','f','p6','2026-11-30 22:00Z',null);`);
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    const values: string[] = [];
    const filters: string[] = [];
    for (const [key, raw] of url.searchParams) {
      if (!['captain_id','form_id','sent_at','answered_at'].includes(key)) continue;
      if (raw === 'not.is.null') { filters.push(`${key} is not null`); continue; }
      const dot = raw.indexOf('.');
      const op = { eq: '=', gte: '>=', lt: '<' }[raw.slice(0, dot)];
      if (!op) throw new Error('Unexpected filter');
      values.push(raw.slice(dot + 1)); filters.push(`${key} ${op} $${values.length}`);
    }
    const where = filters.join(' and ');
    if (init?.method === 'HEAD') {
      const result = await db.query<{ count: number }>(`select count(*)::int as count from form_requests where ${where}`, values);
      return new Response(null, { status: 200, headers: { 'content-range': `*/${result.rows[0]?.count}` } });
    }
    const result = await db.query(`select player_id,sent_at,answered_at from form_requests where ${where} order by id`, values);
    return Response.json(result.rows);
  } } });
  try {
    const period = monthPeriod(new Date('2026-11-01T00:00:00Z'));
    expect(period).toEqual({ start: '2026-10-31T22:00:00.000Z', end: '2026-11-30T22:00:00.000Z' });
    const result = await loadMetrics(client, 'a', period, 'f');
    expect(result).toMatchObject({ sent: 3, answered: 2, recipients: 2, averageHours: 337 });
    expect(await loadMetrics(client, 'a', period, 'empty')).toMatchObject({ sent: 0, answered: 0, recipients: 0, averageHours: null });
  } finally { await db.close(); }
});

it('uses the Cairo month and DST offset at each boundary', () => {
  expect(monthPeriod(new Date('2026-04-30T21:30:00Z'))).toEqual({ start: '2026-04-30T21:00:00.000Z', end: '2026-05-31T21:00:00.000Z' });
});
