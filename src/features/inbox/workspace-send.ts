import { nextTask, taskKey } from './workspace-model';
import type { WorkspaceInboxData, WorkspaceItem } from './workspace-types';
import { reviewStatusCounts } from './workspace-updates';
type ReplyItem = Exclude<WorkspaceItem, { kind: 'request' }>;
export async function sendWorkspaceReview({ data, visible, current, reply, advance, now, mutate, review, failure }: {
  data: WorkspaceInboxData; visible: WorkspaceItem[]; current: ReplyItem; reply: string; advance: boolean; now: Date;
  mutate: (update: (value: WorkspaceInboxData | undefined) => WorkspaceInboxData, commit: () => Promise<void>) => Promise<boolean>;
  review: (item: ReplyItem, reply: string) => Promise<void>; failure: string;
}): Promise<WorkspaceItem | null> {
  const next = advance ? nextTask(visible, current) : null;
  const ok = await mutate(value => {
    const base = value ?? data, counts = base.counts;
    return { ...base, at: now.toISOString(), oldest: undefined,
      statusCounts: reviewStatusCounts(base, current, now),
      ...(base.reviews ? { reviews: { ...base.reviews, total: base.reviews.total + 1 } } : {}),
      ...(counts ? { counts: { ...counts, all: Math.max(0, counts.all - 1), [current.kind]: Math.max(0, counts[current.kind] - 1) } } : {}),
      items: base.items.map(item => taskKey(item) === taskKey(current)
        ? { ...current, reviewed_at: now.toISOString(), reply: reply.trim() || null } : item) };
  },
  () => review(current, reply));
  if (!ok) throw new Error(failure);
  return next;
}
