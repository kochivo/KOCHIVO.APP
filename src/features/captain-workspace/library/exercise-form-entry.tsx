'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
const ExerciseForm = dynamic(() => import('./exercise-form').then(module => module.ExerciseForm), {
  loading: () => <LoadingState variant="detail" />,
});
export function ExerciseFormEntry(props: { exerciseId?: string; returnTo?: string }) {
  return <ExerciseForm {...props} />;
}
