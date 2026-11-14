import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { ExerciseLibraryEntry } from '@/features/captain-workspace';

export default function ExerciseLibraryPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <ExerciseLibraryEntry />;
}
