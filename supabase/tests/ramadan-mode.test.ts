import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';
import { PRAYER_CITIES, sunsetAndFajr } from '../../src/lib/prayer-times';

let db: PGlite;
let captain: string, player: string, stranger: string;
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (!file.startsWith('0052_')) return;
    await database.exec(`create schema cron;
      create table cron.jobs(name text primary key,schedule text,command text);
      create function cron.schedule(text,text,text) returns bigint language sql as $$
        insert into cron.jobs values($1,$2,$3) on conflict(name) do update
          set schedule=excluded.schedule,command=excluded.command returning 1::bigint $$;`);
  });
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-01-01'));
  stranger = await createUser(db, 'captain');
  await db.query(`update coach_clients set access_until='2031-01-01' where player_id=$1`, [player]);
});
afterAll(async () => { await db?.close(); });
it('sends active captains one seasonal notification per year using their own calendar', async () => {
  expect((await db.query(`select schedule,command from cron.jobs where name='ramadan-soon'`)).rows)
    .toEqual([{ schedule: '0 6 * * *', command: 'select security_private.queue_ramadan_soon()' }]);
  const owner = await createUser(db, 'captain');
  const suspended = await createUser(db, 'captain');
  const pending = await createUser(db, 'captain');
  await db.query(`update profiles set timezone='Europe/London' where role='captain'`);
  await db.query(`update profiles set timezone='Asia/Dubai',ramadan_mode=true where id=$1`, [owner]);
  await db.query(`update profiles set suspended_at=now() where id=$1`, [suspended]);
  await db.query(`update profiles set captain_status='pending' where id=$1`, [pending]);
  await db.exec(`select security_private.queue_ramadan_soon('2027-01-24T22:00:00Z');
    select security_private.queue_ramadan_soon('2027-01-24T22:00:00Z')`);
  expect((await db.query(`select user_id,payload from notifications where type='ramadan_soon'`)).rows)
    .toEqual([{ user_id: owner, payload: { year: 2027 } }]);
  await db.exec(`select security_private.queue_ramadan_soon('2027-01-25T06:00:00Z');
    select security_private.queue_ramadan_soon('2027-01-26T06:00:00Z')`);
  expect((await db.query(`select user_id from notifications where type='ramadan_soon' and user_id in($1,$2,$3)`, [owner,suspended,pending])).rows)
    .toEqual([{ user_id: owner }]);
  await db.exec(`select security_private.queue_ramadan_soon('2029-12-22T06:00:00Z');
    select security_private.queue_ramadan_soon('2029-12-22T06:00:00Z')`);
  expect((await db.query(`select payload from notifications where type='ramadan_soon' and user_id=$1 order by payload->>'year'`, [owner])).rows)
    .toEqual([{ payload: { year: 2027 } }, { payload: { year: 2030 } }]);
});
async function clock(date: string) {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '${date}' $$; discard plans;`);
}
async function active() {
  return asUser(db, player, async tx => (await tx.query<{ active: boolean }>('select * from public.my_ramadan()')).rows[0]?.active);
}
it('defaults off, activates during Ramadan, and automatically stops after Eid', async () => {
  await clock('2027-02-15T12:00:00Z');
  expect(await active()).toBe(false);
  await db.query('update profiles set ramadan_mode=true where id=$1', [captain]);
  expect(await active()).toBe(true);
  await clock('2027-03-10T12:00:00Z');
  expect(await active()).toBe(false);
});
it('allows only the owning captain to manage exemptions and the player to read', async () => {
  await clock('2027-02-15T12:00:00Z');
  await expect(asUser(db, stranger, tx => tx.query('insert into ramadan_exempt(captain_id,player_id) values($1,$2)', [stranger, player]))).rejects.toThrow();
  await asUser(db, captain, tx => tx.query('insert into ramadan_exempt(captain_id,player_id) values($1,$2)', [captain, player]));
  expect(await active()).toBe(false);
  expect((await asUser(db, player, tx => tx.query('select * from ramadan_exempt'))).rows).toHaveLength(1);
  expect((await asUser(db, stranger, tx => tx.query('select * from ramadan_exempt'))).rows).toHaveLength(0);
  await asUser(db, player, tx => tx.query('delete from ramadan_exempt'));
  expect(await active()).toBe(false);
  await asUser(db, captain, tx => tx.query('delete from ramadan_exempt'));
  expect(await active()).toBe(true);
});
it('queues at most one Ramadan reminder per player and training date', async () => {
  await clock('2027-02-15T18:00:00Z');
  await db.query(`insert into programs(captain_id,player_id,title,status) values($1,$2,'Plan','active')`, [captain, player]);
  await db.exec(`insert into program_days(program_id,title,position,weekday)
    select id,'Training',1,2 from programs where status='active'`);
  await db.exec(`select security_private.queue_ramadan_reminders('2027-02-15T18:00:00Z');
    select security_private.queue_ramadan_reminders('2027-02-15T18:00:00Z')`);
  expect((await db.query(`select * from notifications where type='workout_reminder' and user_id=$1`, [player])).rows).toHaveLength(1);
});
it('saves the team and exemptions atomically with authenticated profile column grants', async () => {
  const prefs = { ramadan_mode: true, ramadan_training: 'before_iftar_1h', ramadan_intensity: 'maintenance', ramadan_water_ml: 2500 };
  await asUser(db, captain, tx => tx.query('select public.save_ramadan($1,$2)', [JSON.stringify(prefs), [player]]));
  expect(await active()).toBe(false);
  await expect(asUser(db, captain, tx => tx.query('select public.save_ramadan($1,$2)', [JSON.stringify({ ...prefs, ramadan_mode: false }), [stranger]]))).rejects.toThrow();
  expect((await db.query<{ ramadan_mode: boolean }>('select ramadan_mode from profiles where id=$1', [captain])).rows[0]?.ramadan_mode).toBe(true);
});
it('persists explicit meal slots through the existing atomic plan saver', async () => {
  const plan = await db.query<{ id: string }>(`insert into nutrition_plans(captain_id,player_id,title) values($1,$2,'Meals') returning id`, [captain, player]);
  const id = plan.rows[0]?.id;
  const meal = (await db.query<{ id: string }>('select gen_random_uuid() id')).rows[0]?.id;
  const draft = { title: 'Meals', targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 }, meals: [{ id: meal, name: 'Meal', items: [], ramadanSlot: 'suhoor' }] };
  await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1,$2)', [id, JSON.stringify(draft)]));
  expect((await db.query<{ ramadan_slot: string }>('select ramadan_slot from meals where id=$1', [meal])).rows[0]?.ramadan_slot).toBe('suhoor');
});
it('keeps SQL city coordinates and NOAA sunset identical to the offline module', async () => {
  const cities = await db.query<{ code: string; lat: number; lng: number; timezone: string }>('select * from security_private.prayer_cities order by code');
  expect(cities.rows).toEqual([...PRAYER_CITIES].sort((a, b) => a.code.localeCompare(b.code)));
  for (const city of PRAYER_CITIES) {
    const result = await db.query<{ sunset: Date }>(`select security_private.sunset_utc('2027-02-15',$1,$2) sunset`, [city.lat, city.lng]);
    expect(Math.abs(new Date(result.rows[0]?.sunset ?? 0).getTime() - sunsetAndFajr('2027-02-15', city).maghrib.getTime())).toBeLessThan(2);
  }
});
it('skips the morning reminder for active Ramadan players and rejects suspended reads', async () => {
  await clock('2027-02-15T06:00:00Z');
  await db.query('delete from notifications where user_id=$1', [player]);
  await db.query('delete from ramadan_exempt where player_id=$1', [player]);
  await db.query(`update profiles set ramadan_mode=true where id=$1`, [captain]);
  await db.exec(`select public.queue_workout_reminders('2027-02-15')`);
  expect((await db.query(`select * from notifications where type='workout_reminder' and user_id=$1`, [player])).rows).toHaveLength(0);
  await db.query(`update profiles set suspended_at=now() where id=$1`, [player]);
  await expect(active()).rejects.toThrow();
});
