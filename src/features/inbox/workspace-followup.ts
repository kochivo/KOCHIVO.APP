import { daysBetween } from '@/lib/dates';
import { previousCheckins } from './triage';
import type { CheckinHistory, TriageInputs } from './triage';
import type { TaskKind } from './workspace-model';
import type { WorkspaceItem } from './workspace-types';
import { orderWorkspaceTasks, workspaceTriage } from './workspace-triage';

export type FollowupStatus = 'waiting' | 'overdue' | 'completed';
export const isOverdue = (item: WorkspaceItem, now: Date) => !item.reviewed_at && now.getTime() - Date.parse(item.created_at) > 86_400_000;
export function followupView(items: WorkspaceItem[], inputs: TriageInputs, now: Date,
  filter: { kind: TaskKind | 'all'; status: FollowupStatus; search: string }) {
  const matches = items.filter(item => (filter.kind === 'all' || item.kind === filter.kind)
    && item.player_name.toLocaleLowerCase().includes(filter.search.trim().toLocaleLowerCase()));
  const accepts = (item: WorkspaceItem, status: FollowupStatus) => status === 'completed' ? Boolean(item.reviewed_at)
    : status === 'overdue' ? isOverdue(item, now) : !item.reviewed_at;
  const counts = { waiting: matches.filter(item => accepts(item, 'waiting')).length,
    overdue: matches.filter(item => accepts(item, 'overdue')).length, completed: matches.filter(item => accepts(item, 'completed')).length };
  const visible = orderWorkspaceTasks(matches.filter(item => accepts(item, filter.status)), inputs, now, 'all');
  return { counts, visible, attention: visible.filter(item => workspaceTriage(item, inputs, now).group === 'attention'),
    routine: visible.filter(item => workspaceTriage(item, inputs, now).group === 'routine') };
}
export function followupMetrics(items: WorkspaceItem[], now: Date, weekAt: string) {
  const reviews = items.filter(item => item.reviewed_at && item.reviewed_at >= weekAt && Date.parse(item.reviewed_at) <= now.getTime());
  const replies = reviews.filter(item => 'reply' in item && item.reply?.trim());
  return { reviewedWeek: reviews.length, replyHours: replies.length ? replies.reduce((sum, item) =>
    sum + Math.max(0, Date.parse(item.reviewed_at ?? '') - Date.parse(item.created_at)) / 3_600_000, 0) / replies.length : null,
  oldest: items.filter(item => !item.reviewed_at).map(item => item.created_at).sort()[0] ?? null };
}
export function checkinKpis(item: Extract<WorkspaceItem, { kind: 'checkin' }>, history: CheckinHistory[]) {
  const previous = previousCheckins(item, history)[0];
  const change = (key: 'body_weight_kg' | 'waist_cm') => item[key] != null && previous?.[key] != null
    && daysBetween(previous.week_start, item.week_start) === 7 ? Math.round((item[key] - previous[key]) * 10) / 10 : null;
  return [{ key: 'weight' as const, value: item.body_weight_kg, change: change('body_weight_kg') },
    { key: 'waist' as const, value: item.waist_cm, change: change('waist_cm') },
    { key: 'adherence' as const, value: null, change: null }];
}
