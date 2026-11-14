import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const ExerciseFormEntry = dynamic(() => import('@/features/captain-workspace').then(module => module.ExerciseFormEntry));

export default async function NewExercisePage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  if (!captainWorkspaceEnabled()) notFound();
  const { returnTo } = await searchParams;
  return <ExerciseFormEntry returnTo={typeof returnTo === 'string' ? returnTo : undefined} />;
}
