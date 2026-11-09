type SwapCandidate = { exercise_id: string; pattern: string; stress: readonly string[] };

export function swapOptions<T extends SwapCandidate>(exerciseId: string, injuries: readonly string[], candidates: readonly T[]): T[] {
  const pattern = candidates.find(row => row.exercise_id === exerciseId)?.pattern;
  if (!pattern) return [];
  const seen = new Set([exerciseId]);
  return [...candidates].sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)).filter(row => {
    if (seen.has(row.exercise_id) || row.pattern !== pattern || row.stress.some(stress => injuries.includes(stress))) return false;
    seen.add(row.exercise_id);
    return true;
  }).slice(0, 3);
}
