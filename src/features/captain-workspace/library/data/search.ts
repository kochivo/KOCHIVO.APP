'use server';

import { searchExercises } from '@/features/programs';

// A local server action keeps the programs barrel (editor UI) out of the library's client bundle.
export async function searchLibraryExercises(options: Parameters<typeof searchExercises>[0]) {
  return searchExercises(options);
}
