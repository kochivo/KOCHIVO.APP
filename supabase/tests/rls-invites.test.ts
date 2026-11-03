import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, dayOffset } from './harness';

let db: PGlite;

beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });

async function invite(captain: string, code: string) {
  const accessUntil = await dayOffset(db, 30);
  await asUser(db, captain, (tx) => tx.query(
    `insert into public.coach_invites (captain_id, code, access_until) values ($1, $2, $3)`, [captain, code, accessUntil],
  ));
}

const redeem = (player: string, code: string) => asUser(db, player, (tx) => tx.query<{ id: string }>(
  `select public.redeem_invite($1) as id`, [code],
));

describe('invite redemption', () => {
  it('A valid invite links the player and cannot be redeemed twice.', async () => {
    const captain = await createUser(db, 'captain');
    const player = await createUser(db, 'player');
    await invite(captain, 'valid-code');
    const result = await redeem(player, 'valid-code');
    expect(result.rows).toHaveLength(1);
    const link = await asUser(db, player, (tx) => tx.query(
      `select id, captain_id, player_id from public.coach_clients`,
    ));
    expect(link.rows).toEqual([{ id: result.rows[0]?.id, captain_id: captain, player_id: player }]);
    const redeemed = await db.query(`select redeemed_by, redeemed_at is not null as used from public.coach_invites where code = 'valid-code'`);
    expect(redeemed.rows).toEqual([{ redeemed_by: player, used: true }]);
    await expect(redeem(player, 'valid-code')).rejects.toThrow(/invite is invalid or expired/);
    const secondPlayer = await createUser(db, 'player');
    await expect(redeem(secondPlayer, 'valid-code')).rejects.toThrow(/invite is invalid or expired/);
  });

  it('A player with an active captain cannot redeem another captain’s invite.', async () => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const otherCaptain = await createUser(db, 'captain');
    await invite(otherCaptain, 'second-captain');
    await expect(redeem(player, 'second-captain'))
      .rejects.toMatchObject({ code: '23505', constraint: 'coach_clients_one_active_captain' });
    const result = await db.query(`select captain_id from public.coach_clients where player_id = $1 and archived_at is null`, [player]);
    expect(result.rows).toEqual([{ captain_id: captain }]);
    expect((await db.query(`select redeemed_at from public.coach_invites where code = 'second-captain'`)).rows).toEqual([{ redeemed_at: null }]);
  });

  it('A free captain with five active players cannot accept a sixth through an invite.', async () => {
    const { captain } = await createCaptainWithPlayer(db);
    const accessUntil = await dayOffset(db, 30);
    for (let index = 0; index < 4; index++) {
      const player = await createUser(db, 'player');
      await asUser(db, captain, (tx) => tx.query(
        `insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, $3)`, [captain, player, accessUntil],
      ));
    }
    expect((await db.query(`select plan from public.profiles where id = $1`, [captain])).rows).toEqual([{ plan: 'free' }]);
    await invite(captain, 'full-captain');
    const sixth = await createUser(db, 'player');
    await expect(redeem(sixth, 'full-captain')).rejects.toThrow(/5 active players/);
    expect((await db.query(`select id from public.coach_clients where captain_id = $1 and archived_at is null`, [captain])).rows).toHaveLength(5);
    expect((await db.query(`select redeemed_at from public.coach_invites where code = 'full-captain'`)).rows).toEqual([{ redeemed_at: null }]);
  });
});
