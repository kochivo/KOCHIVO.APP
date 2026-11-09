import type { KoFeedItem } from './types';

const order: KoFeedItem['kind'][] = ['swap_requested', 'join_requested', 'expired', 'expiring', 'sessions_used_up', 'today_workout', 'my_expiring', 'inactive', 'no_program', 'no_nutrition', 'log_meal'];
export function rankFeed(rows: readonly KoFeedItem[]) {
  return [...rows].sort((a, b) => Number(b.severity === 'urgent') - Number(a.severity === 'urgent')
    || order.indexOf(a.kind) - order.indexOf(b.kind) || a.key.localeCompare(b.key));
}
export function groupFeed(rows: readonly KoFeedItem[]) {
  const ranked = rankFeed(rows);
  return { urgent: ranked.filter(row => row.severity === 'urgent'), generate: ranked.filter(row => row.severity === 'generate') };
}
export function urgentCount(rows: readonly KoFeedItem[]) {
  return rows.filter(row => row.severity === 'urgent').length;
}
