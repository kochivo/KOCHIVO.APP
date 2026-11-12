export type TaskKind = 'checkin' | 'assessment' | 'request' | 'form';
type Task = { kind: TaskKind; id: string; reviewed_at: string | null };
export const taskKey = (item: Task) => `${item.kind}:${item.id}`;
export function filterTasks<T extends Task>(items: readonly T[], kind: TaskKind | 'all'): T[] {
  return items.filter(item => !item.reviewed_at && (kind === 'all' || item.kind === kind));
}
export function taskCounts(items: readonly Task[]) {
  return { all: filterTasks(items, 'all').length, checkin: filterTasks(items, 'checkin').length,
    assessment: filterTasks(items, 'assessment').length, request: filterTasks(items, 'request').length,
    form: filterTasks(items, 'form').length };
}
export function nextTask<T extends Task>(items: readonly T[], current: Task): T | null {
  const index = items.findIndex(item => taskKey(item) === taskKey(current));
  return [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))]
    .find(item => !item.reviewed_at && taskKey(item) !== taskKey(current)) ?? null;
}
