'use client';
import { TasksStateEntry } from '@/features/captain-workspace';
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <TasksStateEntry kind="error" retry={retry} />;
}
