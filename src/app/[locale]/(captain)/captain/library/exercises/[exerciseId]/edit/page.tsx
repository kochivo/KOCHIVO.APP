import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const ExerciseFormEntry = dynamic(() => import('@/features/captain-workspace').then(module => module.ExerciseFormEntry));

export default async function EditExercisePage({ params, searchParams }: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  if (!captainWorkspaceEnabled()) notFound();
  const [{ exerciseId }, { returnTo }] = await Promise.all([params, searchParams]);
  return <ExerciseFormEntry exerciseId={exerciseId} returnTo={typeof returnTo === 'string' ? returnTo : undefined} />;
}
