import type { LibraryExercise } from '@/features/programs';
import { equipmentTiers, levels } from './brief';
import type { GeneratorBrief } from './brief';
import { injuryPatterns, slotPatterns } from './splits';

export const patterns = ['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull',
  'chest_iso', 'shoulder_iso', 'biceps', 'triceps', 'legs_iso', 'calves', 'core'] as const;
export type Pattern = typeof patterns[number];
export type Candidate = {
  exercise_id: string; pattern: Pattern; kind: 'compound' | 'isolation';
  equipment: GeneratorBrief['equipment']; stress: GeneratorBrief['injuries'];
  min_level: GeneratorBrief['level']; usage: number; library: LibraryExercise | null;
};
export type Reason = `injury_safe_${GeneratorBrief['injuries'][number]}` |
  `replaced_for_${GeneratorBrief['injuries'][number]}` | 'captain_favorite';

export function selectionReasons(pattern: Pattern, selected: Candidate, brief: GeneratorBrief,
  uninjured: readonly Candidate[]): Reason[] {
  const reasons: Reason[] = [];
  for (const injury of brief.injuries) {
    if (injuryPatterns[injury].includes(selected.pattern)) reasons.push(`injury_safe_${injury}`);
    if (selected.pattern !== pattern && uninjured.some(row => row.pattern === pattern && row.stress.includes(injury)))
      reasons.push(`replaced_for_${injury}`);
  }
  if (selected.usage > 0) reasons.push('captain_favorite');
  return reasons;
}

export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) ^ Math.floor(seed / 0x100000000);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function eligible(brief: GeneratorBrief, candidates: readonly Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return [...candidates].sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)).filter(row => {
    if (seen.has(row.exercise_id) || equipmentTiers.indexOf(row.equipment) > equipmentTiers.indexOf(brief.equipment)
      || levels.indexOf(row.min_level) > levels.indexOf(brief.level)
      || row.stress.some(stress => brief.injuries.includes(stress))) return false;
    seen.add(row.exercise_id);
    return true;
  });
}

export function pick(pattern: Pattern, candidates: readonly Candidate[], dayUsed: ReadonlySet<string>,
  weekUsed: ReadonlySet<string>, random: () => number) {
  for (const option of slotPatterns(pattern)) {
    const ranked = candidates.filter(row => row.pattern === option && !dayUsed.has(row.exercise_id))
      .map(row => ({ row, tie: random(), used: weekUsed.has(row.exercise_id) ? 1 : 0 }))
      .sort((a, b) => a.used - b.used || b.row.usage - a.row.usage || a.tie - b.tie);
    const selected = ranked[0]?.row;
    if (selected) return { selected, alternatives: ranked.slice(1, 4).map(({ row }) => row.exercise_id) };
  }
  return null;
}
