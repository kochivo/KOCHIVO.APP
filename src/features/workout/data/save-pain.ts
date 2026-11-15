import { saveAndQueue, stableId } from '@/core/offline';
import type { KochivoDB } from '@/core/offline';
import type { PainReportRow } from '@/core/offline/pain-tables';

export async function savePain(db: KochivoDB, input: Omit<PainReportRow, 'id' | 'created_at'>, now: number): Promise<PainReportRow> {
  const id = await stableId('pain', input.session_id ?? '', input.program_exercise_id ?? '', String(input.set_index));
  const existing = await db.pain_reports.get(id);
  if (existing) return existing;
  const row = { ...input, id, created_at: new Date(now).toISOString() };
  await saveAndQueue(db, 'pain_reports', row, now);
  return row;
}
