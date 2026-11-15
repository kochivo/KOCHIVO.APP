export type RamadanSlot = 'iftar' | 'post_workout' | 'suhoor';
export function groupRamadanMeals<T extends { position: number; ramadan_slot?: RamadanSlot | null }>(meals: readonly T[]) {
  const sorted = [...meals].sort((a, b) => a.position - b.position);
  const groups: Record<RamadanSlot, T[]> = { iftar: [], post_workout: [], suhoor: [] };
  sorted.forEach((meal, index) => {
    const slot = meal.ramadan_slot ?? (index === 0 ? 'iftar' : index === sorted.length - 1 ? 'suhoor' : 'post_workout');
    groups[slot].push(meal);
  });
  return groups;
}
