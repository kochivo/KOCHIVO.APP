import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { FoodsLibraryEntry } from '@/features/meal-plans';

export default function FoodsLibraryPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <FoodsLibraryEntry />;
}
