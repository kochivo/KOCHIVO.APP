import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { KochivoDB } from './db';
import { stableId } from './ids';

it('upgrades existing rows to main sets and preserves their ids', async () => {
  const name = 'drop-upgrade-test';
  const old = new Dexie(name);
  old.version(6).stores({ set_logs: 'id, session_id, &[session_id+program_exercise_id+set_index]' });
  const id = await stableId('set', 's', 'e', '1');
  await old.table('set_logs').put({ id, session_id: 's', program_exercise_id: 'e', set_index: 1 });
  old.close();
  const db = new KochivoDB(name);
  try {
    expect(await db.set_logs.get(id)).toMatchObject({ id, drop_index: 0 });
  } finally { await db.delete(); }
});
