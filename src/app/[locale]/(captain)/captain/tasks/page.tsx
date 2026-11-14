import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { TasksEntry } from '@/features/captain-workspace/server';
export default function TasksPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <TasksEntry />;
}
