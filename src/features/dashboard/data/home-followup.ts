import 'server-only';
import { loadWorkspaceInbox, orderWorkspaceTasks, workspaceTriage } from '@/features/inbox/server';
import type { ReviewRow } from '../home/model';

export async function loadHomeFollowup(now: Date) {
  const data = await loadWorkspaceInbox(50, now.toISOString());
  const items = data.items.filter(item => !item.reviewed_at && item.kind !== 'request');
  const rows: ReviewRow[] = orderWorkspaceTasks(items, data.triage, now, 'all').flatMap(item => {
    if (item.kind === 'request') return [];
    const result = workspaceTriage(item, data.triage, now);
    return [{ id: item.id, playerId: item.player_id, name: item.player_name, kind: item.kind, at: item.created_at,
      title: item.kind === 'assessment' ? item.title : item.kind === 'form' ? item.exercise_name : '',
      flags: result.flags.length ? result.flags.map(flag => flag.key) : result.group === 'attention' ? ['assessmentAlert' as const] : [] }];
  });
  return { rows, count: data.counts ? data.counts.checkin + data.counts.form + data.counts.assessment : items.length,
    requests: data.items.filter(item => item.kind === 'request').map(item => ({ id: item.id, name: item.player_name, at: item.created_at })) };
}
