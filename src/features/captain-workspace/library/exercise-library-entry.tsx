'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
const ExerciseLibrary = dynamic(() => import('./exercise-library').then(module => module.ExerciseLibrary), {
  loading: () => <LoadingState variant="cards" />,
});
export function ExerciseLibraryEntry() {
  return <ExerciseLibrary />;
}
