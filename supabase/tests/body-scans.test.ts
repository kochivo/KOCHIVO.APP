import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let player: string;
let captain: string;
let other: string;
let n = 0;
const id = () => `01900000-0000-7000-8000-${String(++n).padStart(12, '0')}`;
const sql = (user: string, query: string, args: unknown[] = []) => asUser(db, user, tx => tx.query(query, args));
const insert = (user: string, date = '2026-10-01', weight: number | null = 80, muscle: number | null = null,
  fat: number | null = null, path: string | null = null) => sql(user, `insert into public.body_scans
  (id,scan_date,weight_kg,muscle_kg,fat_pct,file_path) values ($1,$2,$3,$4,$5,$6) returning id`, [id(), date, weight, muscle, fat, path]);

beforeAll(async () => {
  db = await createTestDb();
  await db.exec('grant delete on storage.objects to authenticated');
  ({ player, captain } = await createCaptainWithPlayer(db, '2026-09-01'));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });

it('allows owner CRUD and only the active coach to read', async () => {
  await insert(player);
  expect((await sql(player, 'select * from body_scans')).rows).toHaveLength(1);
  expect((await sql(captain, 'select * from body_scans')).rows).toHaveLength(1);
  expect((await sql(other, 'select * from body_scans')).rows).toHaveLength(0);
  await expect(sql(captain, `insert into body_scans(id,player_id,scan_date,weight_kg)
    values ($1,$2,'2026-10-02',80)`, [id(), player])).rejects.toThrow();
  expect((await sql(captain, 'update body_scans set weight_kg=90 returning id')).rows).toHaveLength(0);
  expect((await sql(captain, 'delete from body_scans returning id')).rows).toHaveLength(0);
  expect((await sql(player, 'update body_scans set weight_kg=81 returning id')).rows).toHaveLength(1);
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); return tx.query('select * from public.body_scans'); })).rejects.toThrow();
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  expect((await sql(captain, 'select * from body_scans')).rows).toHaveLength(0);
  await db.query('update coach_clients set archived_at=null where player_id=$1', [player]);
  expect((await sql(player, 'delete from body_scans returning id')).rows).toHaveLength(1);
});

it('enforces ranges, a number, Cairo date, uniqueness, and the exact folder prefix', async () => {
  for (const [weight, muscle, fat] of [[19.9, null, null], [400.1, null, null], [null, 4.9, null],
    [null, 150.1, null], [null, null, 2.9], [null, null, 70.1], [null, null, null]]) {
    await expect(insert(player, '2026-09-01', weight, muscle, fat)).rejects.toThrow();
  }
  await expect(insert(player, '2026-11-04')).rejects.toThrow();
  await expect(insert(player, '2026-09-01', 80, null, null, `${other}/scan.pdf`)).rejects.toThrow();
  await expect(insert(player, '2026-09-01', 80, null, null, player)).rejects.toThrow();
  await expect(insert(player, '2026-09-01', 80, null, null, `${player}/${'a'.repeat(300)}`)).rejects.toThrow();
  await insert(player, '2026-09-01', 20, 5, 3, `${player}/scan.pdf`);
  await expect(insert(player, '2026-09-01')).rejects.toThrow();
  await insert(player, '2026-09-02', 400, 150, 70);
  await expect(sql(player, 'update body_scans set player_id=$1', [other])).rejects.toThrow();
});

it('keeps documents private with owner insert/delete and active coach read only', async () => {
  const path = `${player}/${id()}.pdf`;
  const upload = (user: string, name: string) => sql(user, "insert into storage.objects(bucket_id,name) values ('body-scans',$1)", [name]);
  await upload(player, path);
  await insert(player, '2026-10-03', 80, null, null, path);
  await expect(upload(captain, `${player}/${id()}.jpg`)).rejects.toThrow();
  await expect(upload(player, `${other}/${id()}.jpg`)).rejects.toThrow();
  const read = (user: string) => sql(user, "select * from storage.objects where bucket_id='body-scans'");
  expect((await read(player)).rows).toHaveLength(1);
  expect((await read(captain)).rows).toHaveLength(1);
  expect((await read(other)).rows).toHaveLength(0);
  expect((await sql(captain, "delete from storage.objects where bucket_id='body-scans' returning id")).rows).toHaveLength(0);
  expect((await sql(player, "delete from storage.objects where bucket_id='body-scans' returning id")).rows).toHaveLength(1);
  const bucket = await db.query<{ public: boolean; file_size_limit: number; allowed_mime_types: string[] }>("select * from storage.buckets where id='body-scans'");
  expect(bucket.rows[0]).toMatchObject({ public: false, file_size_limit: 5242880,
    allowed_mime_types: ['image/jpeg', 'image/webp', 'application/pdf'] });
});
