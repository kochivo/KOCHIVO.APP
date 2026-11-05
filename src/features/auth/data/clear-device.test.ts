import { afterEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { localDb, setLocalUser } from '@/core/offline/db';
import { closeDeviceDb } from './clear-device';

afterEach(async () => { await setLocalUser(null); await Dexie.delete('kochivo-logout-player'); });

it.each([false, true])('closes local access and retains only pending databases: %s', async pending => {
  await setLocalUser('logout-player');
  const db = localDb();
  await db.open();
  if (pending) await db.outbox.add({ owner_id: 'logout-player', table: 'daily_checks', row_id: 'check',
    revision: 1, enqueued_at: 1, attempts: 0, next_attempt_at: 1 });
  await closeDeviceDb();
  expect(db.isOpen()).toBe(false);
  expect(() => localDb()).toThrow();
  expect(await Dexie.exists(db.name)).toBe(pending);
  if (pending) {
    await setLocalUser('logout-player');
    expect(await localDb().outbox.count()).toBe(1);
  }
});
