import type { QueueRow } from './model';
import { weekStart } from './time';
export function queueMetrics(rows: QueueRow[], now: Date) {
  const week = 7 * 86_400_000;
  const reviewed = rows.filter(row => row.item.reviewed_at);
  const inPeriod = (start: number, end: number) => reviewed.filter(row => {
    const at = Date.parse(row.item.reviewed_at ?? '');
    return at > start && at <= end;
  });
  const current = inPeriod(now.getTime() - week, now.getTime());
  const before = inPeriod(now.getTime() - 2 * week, now.getTime() - week);
  const average = (period: QueueRow[]) => period.length
    ? period.reduce((sum, row) => sum + row.ageHours, 0) / period.length : null;
  const replyHours = average(current), previousHours = average(before);
  return { needsReply: rows.filter(row => !row.item.reviewed_at).length,
    late: rows.filter(row => row.late).length, reviewed: reviewed.length,
    reviewedWeek: reviewed.filter(row => Date.parse(row.item.reviewed_at ?? '') >= weekStart(now)
      && Date.parse(row.item.reviewed_at ?? '') <= now.getTime()).length, all: rows.length, replyHours,
    comparison: replyHours !== null && previousHours !== null ? replyHours - previousHours : null };
}
