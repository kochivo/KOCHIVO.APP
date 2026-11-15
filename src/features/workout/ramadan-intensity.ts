export function ramadanTarget<T extends { weight: number | null; sets: number }>(target: T, intensity: 'same' | 'lighter_20' | 'maintenance'): T {
  return { ...target, weight: intensity === 'lighter_20' && target.weight !== null ? target.weight * 0.8 : target.weight,
    sets: intensity === 'maintenance' ? Math.max(1, target.sets - 1) : target.sets };
}
