'use client';
import { TasksState } from './tasks-state';
export function TasksStateEntry({ kind, retry }: { kind: 'loading' | 'error'; retry?: () => void }) {
  return <TasksState kind={kind} retry={retry} />;
}
