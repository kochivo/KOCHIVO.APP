import { isOverdue } from './workspace-followup';
import type { WorkspaceInboxData, WorkspaceItem } from './workspace-types';
export function reviewStatusCounts(data: WorkspaceInboxData, item: WorkspaceItem, now: Date) {
  if (!data.statusCounts) return undefined;
  const { overdue, completed } = data.statusCounts;
  const decrement = Number(isOverdue(item, now));
  return { overdue: { ...overdue, all: Math.max(0, overdue.all - decrement), [item.kind]: Math.max(0, overdue[item.kind] - decrement) },
    completed: { ...completed, all: completed.all + 1, [item.kind]: completed[item.kind] + 1 } };
}
