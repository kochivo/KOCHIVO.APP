import Dexie from 'dexie';
import { KochivoDB } from './db';

/** Legacy rows have no owner: trust only non-conflicting, matching snapshot owners. */
export async function migrateLegacyDb(target: KochivoDB, userId: string): Promise<void> {
  if (!await Dexie.exists('kochivo')) return;
  const legacy = new KochivoDB('kochivo');
  try {
    const snapshots = [await legacy.program_snapshot.get('active'), await legacy.nutrition_snapshot.get('active')]
      .filter(snapshot => snapshot !== undefined);
    if (snapshots.length && snapshots.every(snapshot => snapshot.player_id === userId)) {
      const contents = await Promise.all(legacy.tables.map(async table => ({ name: table.name,
        rows: await table.toArray() as Record<string, unknown>[] })));
      await target.transaction('rw', target.tables, async () => {
        for (const table of contents) {
          for (const row of table.rows) {
            if (table.name === 'outbox' || table.name === 'media_queue') {
              // Auto-increment ids are local to each database, not the identity of pending work.
              const existing = table.name === 'outbox'
                ? await target.outbox.where('[table+row_id]').equals([String(row.table), String(row.row_id)]).first()
                : await target.media_queue.filter(entry => entry.form_check_id === row.form_check_id).first();
              if (!existing) {
                const entry = { ...row };
                delete entry.id;
                if (table.name === 'outbox') entry.owner_id = userId;
                await target.table(table.name).add(entry);
              }
              continue;
            }
            if ((typeof row.id === 'string' || typeof row.id === 'number')
              && !await target.table(table.name).get(row.id)) await target.table(table.name).put(row);
          }
        }
      });
    }
  } finally { legacy.close(); }
  await Dexie.delete('kochivo');
}
