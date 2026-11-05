import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec('delete from public.coach_clients; delete from public.notifications;');
});

async function fixture(sessions: number | null = null) {
  const users = await createCaptainWithPlayer(db);
  await db.query("update public.profiles set full_name=$2 where id=$1", [users.captain, 'Mona']);
  await db.query("update public.profiles set full_name=$2 where id=$1", [users.player, 'Ali']);
  const { rows } = await db.query<{ id: string }>(`update public.coach_clients
    set access_until='2026-11-06', sessions_left=$2 where player_id=$1 returning id`, [users.player, sessions]);
  return { ...users, link: rows[0]?.id };
}
const queue = (today: string) => db.query('select public.queue_expiry_reminders($1::date)', [today]);
const notices = () => db.query(`select user_id,type,payload from public.notifications
  where type in ('subscription_expiring','subscription_expired') order by user_id,type`);

it.each([null, 4])('notifies both recipients exactly three days before and on expiry, with sessions=%s', async sessions => {
  const { captain, player, link } = await fixture(sessions);
  await queue('2026-11-03');
  await queue('2026-11-03');
  await queue('2026-11-04');
  await queue('2026-11-06');
  await db.exec('update public.notifications set is_read=true');
  await queue('2026-11-06');
  const expected = [
    ['subscription_expiring', 3], ['subscription_expired', 0],
  ].flatMap(([type, days_left]) => [
    { user_id: captain, type, payload: { link_id: link, player_id: player, name: 'Ali', access_until: '2026-11-06', days_left } },
    { user_id: player, type, payload: { link_id: link, captain_name: 'Mona', access_until: '2026-11-06', days_left } },
  ]);
  expect((await notices()).rows).toHaveLength(4);
  expect((await notices()).rows).toEqual(expect.arrayContaining(expected));
});

it('does not notify on day minus two', async () => {
  await fixture();
  await queue('2026-11-04');
  expect((await notices()).rows).toEqual([]);
});

it('allows reminders for a renewed expiry date', async () => {
  const { player } = await fixture();
  await queue('2026-11-03');
  await db.query("update public.coach_clients set access_until='2026-12-06' where player_id=$1", [player]);
  await queue('2026-12-03');
  await queue('2026-12-03');
  expect((await notices()).rows).toHaveLength(4);
});

it.each(['frozen', 'pending', 'archived', 'demo', 'unapproved', 'rejected', 'captain-suspended', 'player-suspended', 'exhausted'])
('skips %s links at both reminder dates', async state => {
  const { captain, player } = await fixture();
  if (state === 'frozen') await db.query('update public.coach_clients set frozen_at=now() where player_id=$1', [player]);
  if (state === 'pending') await db.query('update public.coach_clients set pending=true where player_id=$1', [player]);
  if (state === 'archived') await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [player]);
  if (state === 'demo') await db.query('update public.profiles set demo_expires_at=now() where id=$1', [captain]);
  if (state === 'unapproved' || state === 'rejected') await db.query('update public.profiles set captain_status=$2 where id=$1',
    [captain, state === 'unapproved' ? 'pending' : 'rejected']);
  if (state.endsWith('-suspended')) await db.query('update public.profiles set suspended_at=now() where id=$1',
    [state === 'captain-suspended' ? captain : player]);
  if (state === 'exhausted') await db.query('update public.coach_clients set sessions_left=0 where player_id=$1', [player]);
  await queue('2026-11-03');
  await queue('2026-11-06');
  expect((await notices()).rows).toEqual([]);
});

it('restricts execution and uses a Cairo default with an empty search path', async () => {
  for (const role of ['anon', 'authenticated', 'service_role', 'postgres']) {
    const { rows } = await db.query<{ allowed: boolean }>(
      "select has_function_privilege($1,'public.queue_expiry_reminders(date)','execute') as allowed", [role]);
    expect(rows).toEqual([{ allowed: role === 'service_role' || role === 'postgres' }]);
  }
  const { rows } = await db.query<{ prosecdef: boolean; proconfig: string[]; defaults: string }>(
    `select prosecdef,proconfig,pg_get_expr(proargdefaults,0) as defaults from pg_proc
      where oid='public.queue_expiry_reminders(date)'::regprocedure`);
  expect(rows[0]).toMatchObject({ prosecdef: true, proconfig: ['search_path=""'] });
  expect(rows[0]?.defaults).toContain('Africa/Cairo');
  await fixture();
  await db.exec('select public.queue_expiry_reminders()');
  expect((await notices()).rows).toHaveLength(2);
});
