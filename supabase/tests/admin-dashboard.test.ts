import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';
import type { AdminDashboard, AdminCaptainDetail } from '../../src/features/admin/dashboard-types';
import { adminDashboardSchema, adminCaptainDetailSchema } from '../../src/features/admin/schemas';

let db: PGlite;
let admin: string;
let captain: string;
beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  captain = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });

it('provides the dashboard RPC', async () => {
  const result = await db.query("select to_regprocedure('public.admin_dashboard()') is not null as available");
  expect(result.rows).toEqual([{ available: true }]);
});

it('denies every RPC to non-admins and anonymous callers', async () => {
  for (const sql of ['select admin_dashboard()',
    `select * from admin_captain_activity(array['${captain}']::uuid[])`,
    `select admin_captain_detail('${captain}')`]) {
    await expect(asUser(db, captain, tx => tx.query(sql))).rejects.toMatchObject({ code: '42501' });
    await expect(db.transaction(async tx => {
      await tx.exec('set local role anon');
      await tx.query(sql);
    })).rejects.toMatchObject({ code: '42501' });
  }
});

it('returns zero-filled Cairo days and excludes the owner', async () => {
  const { rows } = await asUser(db, admin, tx => tx.query<{ data: AdminDashboard }>('select admin_dashboard() as data'));
  expect(rows[0]?.data).toMatchObject({ captains: { value: 1, previous: 0 },
    stateCounts: { all: 1, unconfirmed: 1 }, health: { cronJobs: 0, cronFailures24h: 0, pendingDeletions: 0 } });
  const days = rows[0]?.data.signups;
  expect(adminDashboardSchema.safeParse(rows[0]?.data).success).toBe(true);
  expect(days).toHaveLength(30);
  expect(days?.[0]).toEqual({ day: '2026-10-05', captains: 0, players: 0 });
  expect(days?.[29]).toEqual({ day: '2026-11-03', captains: 1, players: 0 });
});

it('computes paid trends, expiry, quiet activity and detail totals from periods', async () => {
  await db.query(`update auth.users set email_confirmed_at = now() where id = $1`, [captain]);
  await db.query(`update profiles set created_at = now() - interval '60 days', social = '{"whatsapp":"0123456789"}' where id = $1`, [captain]);
  // Backdate locked starter plans without their immutability or timestamp triggers.
  await db.transaction(async tx => {
    await tx.exec("set local session_replication_role='replica'");
    await tx.query("update programs set updated_at=now()-interval '10 days' where captain_id=$1", [captain]);
    await tx.query("update nutrition_plans set updated_at=now()-interval '10 days' where captain_id=$1", [captain]);
  });
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by) values
    ($1,'legend',now()-interval '57 days',now()+interval '3 days',1398,$2)`, [captain, admin]);
  const dashboard = async () => (await asUser(db, admin, tx => tx.query<{ data: AdminDashboard }>('select admin_dashboard() data'))).rows[0]?.data;
  expect(await dashboard()).toMatchObject({ mrr: { value: 699, previous: 699 },
    paidCaptains: { value: 1, previous: 1 }, actions: { expiringSoon: 1, quietPaid: 1 } });
  const detail = await asUser(db, admin, tx => tx.query<{ data: AdminCaptainDetail }>('select admin_captain_detail($1) data', [captain]));
  expect(detail.rows[0]?.data).toMatchObject({ id: captain, phone: '0123456789', totalPaidEgp: 1398,
    players: 0, trainedThisWeek: 0, history: [{ tier: 'legend', months: 2, amountEgp: 1398 }] });
  expect(adminCaptainDetailSchema.safeParse(detail.rows[0]?.data).success).toBe(true);
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by) values
    ($1,'legend',now()+interval '3 days',now()+interval '33 days',699,$2)`, [captain, admin]);
  expect(await dashboard()).toMatchObject({ actions: { expiringSoon: 0 } });
});

it('counts distinct trained linked players and caps ordered history without truncating the total', async () => {
  const player = await createUser(db, 'player');
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,test_clock.today()+30)`, [captain, player]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    select gen_random_uuid(),$1,test_clock.today(),now()-interval '1 hour',now(),now() from generate_series(1,2)`, [player]);
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by)
    select $1,'champion',now()-(i+2)*interval '30 days',now()-(i+1)*interval '30 days',399,$2
    from generate_series(1,25) i`, [captain, admin]);
  const { rows } = await asUser(db, admin, tx => tx.query<{ data: AdminCaptainDetail }>('select admin_captain_detail($1) data', [captain]));
  expect(rows[0]?.data).toMatchObject({ players: 1, trainedThisWeek: 1, totalPaidEgp: 12072 });
  const history = rows[0]?.data.history ?? [];
  expect(history).toHaveLength(24);
  expect(history[0]?.tier).toBe('legend');
  expect(history.every((period, i) => i===0 || period.startsAt <= (history[i-1]?.startsAt ?? ''))).toBe(true);
});

it('reads optional cron health and only accounts due for purge', async () => {
  await db.exec(`create schema cron; create table cron.job(id int);
    create table cron.job_run_details(status text,start_time timestamptz);
    insert into cron.job values(1),(2);
    insert into cron.job_run_details values('failed',now()),('succeeded',now()),('failed',now()-interval '2 days')`);
  await db.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id in ($1,$2)`, [admin, captain]);
  const recent = await createUser(db, 'player');
  await db.query('update profiles set deletion_requested_at=now() where id=$1', [recent]);
  const { rows } = await asUser(db, admin, tx => tx.query<{ data: AdminDashboard }>('select admin_dashboard() data'));
  expect(rows[0]?.data.health).toEqual({ cronJobs: 2, cronFailures24h: 1, pendingDeletions: 1 });
});

it('reads the stored profile phone when no social phone exists', async () => {
  await db.query(`update profiles set phone='+201012345678',social='{}' where id=$1`, [captain]);
  const { rows } = await asUser(db, admin, tx => tx.query<{ data: AdminCaptainDetail }>('select admin_captain_detail($1) data', [captain]));
  expect(rows[0]?.data.phone).toBe('+201012345678');
});

it('counts free, suspended, unconfirmed, expired, pending and over-limit captains', async () => {
  const free = await createUser(db, 'captain');
  const suspended = await createUser(db, 'captain');
  const unconfirmed = await createUser(db, 'captain');
  const expired = await createUser(db, 'captain');
  const pending = await createUser(db, 'captain');
  for (const id of [free, suspended, expired, pending]) {
    await db.query('update auth.users set email_confirmed_at=now() where id=$1', [id]);
  }
  await db.query('update profiles set suspended_at=now() where id=$1', [suspended]);
  await db.query(`update profiles set captain_status='pending', role_confirmed=true,
    captain_intake='{"current_tool":"whatsapp_excel","main_challenge":"time_on_tables","players_range":"1-10"}' where id=$1`, [pending]);
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by) values
    ($1,'champion',now()-interval '60 days',now()-interval '30 days',399,$2)`, [expired, admin]);
  // The player cap trigger permits linking while paid; expiry then leaves an over-limit entry account.
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by) values
    ($1,'champion',now()-interval '1 day',now()+interval '30 days',399,$2)`, [free, admin]);
  for (let i=0; i<6; i++) {
    const player = await createUser(db, 'player');
    await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,test_clock.today()+30)`, [free, player]);
  }
  await db.query('delete from captain_subscriptions where captain_id=$1', [free]);
  const { rows } = await asUser(db, admin, tx => tx.query<{ data: AdminDashboard }>('select admin_dashboard() data'));
  expect(rows[0]?.data).toMatchObject({ actions: { pendingCaptains: 1, overLimit: 1 },
    captains: { value: 5, previous: 1 }, players: { value: 8, previous: 0 },
    stateCounts: { all: 5, paid: 1, free: 1, expired: 1, suspended: 1, unconfirmed: 1 },
    planMix: [{ tier: 'entry', captains: 4 }, { tier: 'champion', captains: 0 },
      { tier: 'legend', captains: 1 }, { tier: 'empire', captains: 0 }] });
  expect((await asUser(db, admin, tx => tx.query('select id from admin_captain_activity(array[$1]::uuid[])', [unconfirmed]))).rows)
    .toEqual([{ id: unconfirmed }]);
});

it('uses auth, chat and both plan update sources and limits activity requests', async () => {
  await db.exec('alter table auth.users add column last_sign_in_at timestamptz');
  await db.query(`update auth.users set last_sign_in_at=now()-interval '10 days' where id=$1`, [captain]);
  const activity = async () => (await asUser(db, admin, tx => tx.query('select * from admin_captain_activity(array[$1]::uuid[])', [captain]))).rows[0];
  expect(await activity()).toMatchObject({ quiet: true, expiringSoon: false });
  await db.query(`insert into programs(captain_id,is_template,title) values($1,true,'Activity')`, [captain]);
  expect(await activity()).toMatchObject({ quiet: false });
  await db.query("delete from programs where captain_id=$1 and title='Activity'", [captain]);
  await db.query(`insert into nutrition_plans(captain_id,is_template,title) values($1,true,'Activity')`, [captain]);
  expect(await activity()).toMatchObject({ quiet: false });
  await db.query("delete from nutrition_plans where captain_id=$1 and title='Activity'", [captain]);
  const player = await createUser(db, 'player');
  await db.query(`insert into chat_messages(id,captain_id,player_id,sender_id,body) values(gen_random_uuid(),$1,$2,$1,'Hello')`, [captain, player]);
  expect(await activity()).toMatchObject({ quiet: false });
  await db.query(`insert into chat_messages(id,captain_id,player_id,sender_id,body,created_at)
    values(gen_random_uuid(),$1,$2,$1,'Earlier',now()-interval '10 days')`, [captain, player]);
  const dashboard = await asUser(db, admin, tx => tx.query<{ data: AdminDashboard }>('select admin_dashboard() data'));
  expect(dashboard.rows[0]?.data.activeCaptains.previous).toBe(1);
  await expect(asUser(db, admin, tx => tx.query('select * from admin_captain_activity($1)', [Array.from({ length: 101 }, () => captain)])))
    .rejects.toMatchObject({ code: '22023' });
});
