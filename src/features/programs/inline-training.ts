import type { LibraryExercise } from './types';

const muscles = [
  ['chest', 'صدر'], ['back', 'ضهر', 'ظهر'], ['upper legs', 'lower legs', 'legs', 'leg', 'رجل', 'أرجل'],
  ['shoulders', 'shoulder', 'كتف'], ['upper arms', 'lower arms', 'arms', 'ذراع', 'باي', 'تراي'],
  ['waist', 'abs', 'core', 'بطن', 'كور'], ['glutes', 'جلوتس'],
];
export function trainingMuscles(title: string, existing: string[] = []): string[] {
  const matching = muscles.filter(group => group.some(word => title.toLowerCase().includes(word)));
  return matching.length ? matching.flat() : existing;
}
export function suggestedExercises(title: string, usedIds: string[], library: LibraryExercise[], existing: string[] = []): LibraryExercise[] {
  const targets = trainingMuscles(title, existing);
  return library.filter(row => !usedIds.includes(row.id) && targets.some(word =>
    [row.body_part, row.target].some(value => value?.toLowerCase() === word))).slice(0, 3);
}
