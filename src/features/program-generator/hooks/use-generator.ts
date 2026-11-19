'use client';

import { useState } from 'react';
import { generatorBriefSchema } from '../brief';
import type { GeneratorBrief } from '../brief';
import { generateProgram } from '../generate';
import type { GeneratedProgram } from '../generate';
import { eligible, selectionReasons } from '../pick';
import type { Candidate } from '../pick';
import { prescription } from '../prescription';

export { initialBrief } from '../brief';
export type { IntakeDefaults } from '../brief';

export type ManualSwap = { weekday: number; position: number; exerciseId: string };
export function alternativesFor(program: GeneratedProgram, weekday: number, position: number, candidates: readonly Candidate[]) {
  const day = program.days.find(day => day.weekday === weekday);
  const row = day?.exercises.find(row => row.position === position);
  return (row?.alternatives ?? []).flatMap(id => {
    const candidate = candidates.find(candidate => candidate.exercise_id === id);
    return candidate && !day?.exercises.some(other => other.exercise_id === id) ? [candidate] : [];
  });
}
export function swapExercise(program: GeneratedProgram, brief: GeneratorBrief, candidates: readonly Candidate[],
  weekday: number, position: number, exerciseId: string, preserve = false): GeneratedProgram {
  const day = program.days.find(day => day.weekday === weekday);
  const row = day?.exercises.find(row => row.position === position);
  const selected = eligible(brief, candidates).find(candidate => candidate.exercise_id === exerciseId);
  const current = candidates.find(candidate => candidate.exercise_id === row?.exercise_id);
  if (!day || !row || !selected || current?.pattern !== selected.pattern ||
    day.exercises.some(other => other.exercise_id === exerciseId) || (!preserve && !row.alternatives.includes(exerciseId))) return program;
  const replacement = { ...row, ...prescription(brief.goal, brief.level, selected.kind),
    exercise_id: exerciseId, library: selected.library,
    reasons: selectionReasons(row.replacedPattern ?? selected.pattern, selected, brief, eligible({ ...brief, injuries: [] }, candidates)),
    alternatives: [row.exercise_id, ...row.alternatives.filter(id => id !== exerciseId)].slice(0, 3) };
  return { ...program, days: program.days.map(item => item === day ? { ...day,
    exercises: day.exercises.map(other => other === row ? replacement : other) } : item) };
}
export function regenerateWeek(brief: GeneratorBrief, candidates: readonly Candidate[], previous: GeneratedProgram,
  swaps: ManualSwap[], keep: boolean) {
  const next = { ...brief, seed: brief.seed === Number.MAX_SAFE_INTEGER ? 0 : brief.seed + 1 };
  const result = generateProgram(next, candidates);
  if (result.error) return { brief, program: previous, swaps, error: true };
  let program = result.data;
  const retained: ManualSwap[] = [];
  for (const swap of keep ? swaps : []) {
    const row = program.days.find(day => day.weekday === swap.weekday)?.exercises.find(row => row.position === swap.position);
    const updated = swapExercise(program, next, candidates, swap.weekday, swap.position, swap.exerciseId, true);
    if (updated !== program || row?.exercise_id === swap.exerciseId) retained.push(swap);
    program = updated;
  }
  return { brief: next, program, swaps: retained, error: false };
}
export function useGenerator(defaults: GeneratorBrief, candidates: readonly Candidate[]) {
  const [brief, setBrief] = useState(defaults);
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [swaps, setSwaps] = useState<ManualSwap[]>([]);
  const [error, setError] = useState(false);
  function generate() {
    const result = generateProgram(brief, candidates);
    setError(!!result.error);
    if (result.data) { setProgram(result.data); setSwaps([]); }
  }
  function swap(weekday: number, position: number, exerciseId: string) {
    if (!program) return;
    const next = swapExercise(program, brief, candidates, weekday, position, exerciseId);
    if (next === program) return;
    setProgram(next);
    setSwaps(current => [...current.filter(row => row.weekday !== weekday || row.position !== position), { weekday, position, exerciseId }]);
  }
  function regenerate(keep: boolean) {
    if (!program) return;
    const next = regenerateWeek(brief, candidates, program, swaps, keep);
    setBrief(next.brief); setProgram(next.program); setSwaps(next.swaps); setError(next.error);
  }
  return { brief, setBrief, program, error, swaps, generate, swap, regenerate,
    valid: generatorBriefSchema.safeParse(brief).success, edit: () => { setProgram(null); setError(false); } };
}
