import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
let otherPlayer: string;
let pkg: string;
const as = <T>(user: string, sql: string, params: unknown[] = []) =>
  asUser(db, user, tx => tx.query<T>(sql, params));
const dues = async (user: string) => (await as<{ player_id: string; due_egp: number }>(user, 'select * from public.captain_dues()')).rows;

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: other, player: otherPlayer } = await createCaptainWithPlayer(db));
  pkg = (await as<{ id: string }>(captain, `insert into public.captain_packages (captain_id, name, price_egp, days)
    values ($1, 'شهري', 1500, 30) returning id`, [captain])).rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });

describe('captain packages', () => {
  it('keeps packages private to their captain', async () => {
    expect((await as(other, 'select id from public.captain_packages')).rows).toEqual([]);
    expect((await as(player, 'select id from public.captain_packages')).rows).toEqual([]);
    await expect(as(other, `insert into public.captain_packages (captain_id, name, price_egp, days)
      values ($1, 'x', 1, 1)`, [captain])).rejects.toThrow();
    await expect(as(player, `insert into public.captain_packages (captain_id, name, price_egp, days)
      values ($1, 'x', 1, 1)`, [player])).rejects.toThrow();
    expect((await as(other, `update public.captain_packages set price_egp = 1 where id = $1 returning id`, [pkg])).rows).toEqual([]);
  });
  it('archives instead of deleting', async () => {
    await expect(as(captain, 'delete from public.captain_packages where id = $1', [pkg])).rejects.toThrow();
  });
});

describe('renewals and dues', () => {
  it('fills days and price from the package and records what was paid', async () => {
    await as(captain, 'select public.renew_player($1, p_amount => 500, p_package => $2)', [player, pkg]);
    const row = (await db.query('select days, price_egp, amount_egp, package_id from public.player_payments where player_id = $1', [player])).rows;
    expect(row).toEqual([{ days: 30, price_egp: 1500, amount_egp: 500, package_id: pkg }]);
    expect(await dues(captain)).toEqual([{ player_id: player, due_egp: 1000 }]);
    expect(await dues(other)).toEqual([]);
  });
  it('rejects paying more than the price and another captain\'s package', async () => {
    await expect(as(captain, 'select public.renew_player($1, p_amount => 2000, p_package => $2)', [player, pkg]))
      .rejects.toMatchObject({ code: '22023' });
    await expect(as(other, 'select public.renew_player($1, p_package => $2)', [otherPlayer, pkg]))
      .rejects.toMatchObject({ code: 'P0002' });
  });
  it('collects installments oldest first and never past what is owed', async () => {
    await as(captain, 'select public.renew_player($1, 30, 0, 800)', [player]);
    expect(await dues(captain)).toEqual([{ player_id: player, due_egp: 1800 }]);
    await expect(as(captain, 'select public.collect_player_payment($1, 1801)', [player])).rejects.toMatchObject({ code: '22023' });
    expect((await as<{ left: number }>(captain, 'select public.collect_player_payment($1, 1200) as left', [player])).rows)
      .toEqual([{ left: 600 }]);
    const split = (await db.query(`select p.price_egp, c.amount_egp from public.payment_collections c
      join public.player_payments p on p.id = c.payment_id order by c.amount_egp desc`)).rows;
    expect(split).toEqual([{ price_egp: 1500, amount_egp: 1000 }, { price_egp: 800, amount_egp: 200 }]);
    await as(captain, 'select public.collect_player_payment($1, 600)', [player]);
    expect(await dues(captain)).toEqual([]);
  });
  it('lets only the owning captain collect and both sides read collections', async () => {
    await as(captain, 'select public.renew_player($1, 30, 0, 100)', [player]);
    await expect(as(other, 'select public.collect_player_payment($1, 50)', [player])).rejects.toMatchObject({ code: '42501' });
    await expect(as(player, 'select public.collect_player_payment($1, 50)', [player])).rejects.toMatchObject({ code: '42501' });
    await as(captain, 'select public.collect_player_payment($1, 50)', [player]);
    expect((await as(player, 'select amount_egp from public.payment_collections where amount_egp = 50')).rows).toHaveLength(1);
    expect((await as(other, 'select id from public.payment_collections')).rows).toEqual([]);
    const stranger = await createUser(db, 'captain');
    expect((await as(stranger, 'select id from public.payment_collections')).rows).toEqual([]);
    await expect(as(captain, `insert into public.payment_collections (payment_id, captain_id, player_id, amount_egp)
      select id, captain_id, player_id, 1 from public.player_payments limit 1`)).rejects.toThrow();
  });
  it('treats old renewals without a price as paid in full', async () => {
    await as(other, 'select public.renew_player($1, 30, 700)', [otherPlayer]);
    expect(await dues(other)).toEqual([]);
  });
});
