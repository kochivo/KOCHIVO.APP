import 'server-only';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { LibraryEntry } from '@/features/templates';

export function MealLibraryPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <LibraryEntry kind="nutrition" />;
}
