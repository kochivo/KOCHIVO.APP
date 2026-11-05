import type { Muscle, MuscleVolume } from './muscle-map';

export const groups = ['push', 'pull', 'legs'] as const;
export type MuscleGroup = (typeof groups)[number];

export function muscleGroup(muscle: Muscle): MuscleGroup | null {
  if (['chest', 'frontDelts', 'triceps'].includes(muscle)) return 'push';
  if (['back', 'lats', 'rearDelts', 'biceps', 'forearms'].includes(muscle)) return 'pull';
  if (['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'].includes(muscle)) return 'legs';
  return null;
}

export function balance(volume: MuscleVolume) {
  const counts = { push: 0, pull: 0, legs: 0 };
  for (const [muscle, sets] of Object.entries(volume)) {
    const group = muscleGroup(muscle as Muscle);
    if (group) counts[group] += sets;
  }
  const total = counts.push + counts.pull + counts.legs;
  const exact = groups.map(group => total ? counts[group] / total * 100 : 0);
  const percentages = exact.map(Math.floor);
  // Largest remainders keep the displayed percentages at exactly 100.
  const order = groups.map((_, index) => index).sort((a, b) =>
    ((exact[b] ?? 0) % 1) - ((exact[a] ?? 0) % 1));
  const remainder = total ? 100 - percentages.reduce((sum, value) => sum + value, 0) : 0;
  for (const index of order.slice(0, remainder)) percentages[index] = (percentages[index] ?? 0) + 1;
  return { push: percentages[0] ?? 0, pull: percentages[1] ?? 0, legs: percentages[2] ?? 0,
    core: volume.core ?? 0, under: groups.filter(group => total > 0 && counts[group] / total < .25) };
}
