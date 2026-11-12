import { searchExercises, trainingMuscles } from '@/features/programs';

export async function loadTrainingSearch(query: string, bodyPart = '', mine = false) {
  const aliases: Record<string, string> = { ضهر: 'back', ظهر: 'back', صدر: 'chest', رجل: 'upper legs', كتف: 'shoulders', كابل: 'cable', دمبل: 'dumbbell', بار: 'barbell' };
  const result = await searchExercises({ query: aliases[query.trim()] ?? query, bodyPart, mine, metadata: true });
  if (!result.data) throw new Error(result.error);
  return result.data;
}
export async function loadSuggestions(title: string, existing: string[]) {
  const targets = trainingMuscles(title, existing);
  if (!targets.length) return [];
  const result = await searchExercises({ query: '', bodyPart: '', bodyParts: targets.filter(value => /^[a-z ]+$/.test(value)) });
  if (!result.data) throw new Error(result.error);
  return result.data;
}
