import { afterEach, expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline/db';
import { flushOutbox } from '@/core/offline/sync';
import { savePain } from './data/save-pain';

const db = new KochivoDB('pain-save', 'player');
afterEach(async () => { await db.delete(); });
it('atomically saves one stable report and queues it after the session without a network', async () => {
  const input = { captain_id: 'captain', session_id: 'session', program_exercise_id: 'exercise',
    set_index: 3, area: 'knee_r' as const, severity: 4, kind: 'sharp' as const, side_view: 'front' as const };
  const first = await savePain(db, input, 1000);
  const second = await savePain(db, input, 2000);
  expect(second.id).toBe(first.id);
  expect(await db.pain_reports.count()).toBe(1);
  expect((await db.outbox.toArray()).map(row => [row.table, row.row_id])).toEqual([['pain_reports', first.id]]);
  const sent: string[] = [];
  expect(await flushOutbox(db, async table => { sent.push(table); }, 2000)).toEqual({ sent: 1, failed: 0 });
  expect(sent).toEqual(['pain_reports']);
});
