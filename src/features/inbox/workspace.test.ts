import { describe, expect, it } from 'vitest';
import { taskCounts, filterTasks, nextTask } from './workspace-model';
const tasks = [{ kind: 'checkin', id: '1', reviewed_at: null }, { kind: 'assessment', id: '1', reviewed_at: null },
  { kind: 'request', id: '3', reviewed_at: null }, { kind: 'form', id: '4', reviewed_at: null },
  { kind: 'checkin', id: '5', reviewed_at: '2026-11-12' }] as const;
describe('v6 inbox', () => {
  it('counts each open kind including retained form videos', () => {
    expect(taskCounts(tasks)).toEqual({ all: 4, checkin: 1, assessment: 1, request: 1, form: 1 });
    expect(filterTasks(tasks, 'assessment').map(item => item.id)).toEqual(['1']);
  });
  it('advances across kinds without confusing matching ids or revisiting reviewed tasks', () => {
    expect(nextTask(tasks, tasks[0])).toEqual(tasks[1]);
    expect(nextTask(tasks, tasks[3])).toEqual(tasks[0]);
    expect(nextTask([tasks[0]], tasks[0])).toBeNull();
  });
});
