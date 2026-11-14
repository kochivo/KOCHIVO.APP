export type ExerciseName = { id: string; name_ar: string | null; name_en: string };

export function normalizeExerciseName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim().split(/\s+/)
    .map(word => word === 'ال' ? '' : word.replace(/^ال(?=.{2})/, '')).join(' ').trim();
}

export function similarExercise<T extends ExerciseName>(name: string, rows: readonly T[], excludeId?: string): T | undefined {
  const normalized = normalizeExerciseName(name);
  if (normalized.length < 2) return;
  return rows.find(row => row.id !== excludeId && [row.name_ar, row.name_en].some(value => {
    const candidate = normalizeExerciseName(value ?? '');
    return candidate.length >= 2 && (candidate.includes(normalized) || normalized.includes(candidate));
  }));
}
