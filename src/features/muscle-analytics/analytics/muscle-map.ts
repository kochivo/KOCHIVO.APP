export const regions = ['chest', 'back', 'shoulders', 'arms', 'abs', 'legs'] as const;
export type Region = (typeof regions)[number];

const targets: Record<string, Region> = {
  pectorals: 'chest', 'serratus anterior': 'chest', lats: 'back', 'upper back': 'back',
  traps: 'back', spine: 'back', 'levator scapulae': 'back', delts: 'shoulders',
  biceps: 'arms', triceps: 'arms', forearms: 'arms', abs: 'abs', quads: 'legs',
  glutes: 'legs', hamstrings: 'legs', calves: 'legs', adductors: 'legs', abductors: 'legs',
};
const parts: Record<string, Region> = {
  chest: 'chest', back: 'back', shoulders: 'shoulders', 'upper arms': 'arms',
  'lower arms': 'arms', waist: 'abs', 'upper legs': 'legs', 'lower legs': 'legs',
};
export function muscleMap(target: string | null, bodyPart: string | null): Region | null {
  const primary = target?.trim().toLowerCase() ?? '';
  const fallback = bodyPart?.trim().toLowerCase() ?? '';
  if ([primary, fallback].some(value => value === 'cardio' || value === 'neck')) return null;
  return targets[primary] ?? parts[fallback] ?? null;
}

export function muscleSide(target: string | null, region: Region): 'anterior' | 'posterior' | null {
  if (region === 'chest' || region === 'shoulders') return 'anterior';
  if (region === 'back') return 'posterior';
  const primary = target?.trim().toLowerCase();
  if (region === 'legs' && primary === 'quads') return 'anterior';
  if (region === 'legs' && (primary === 'hamstrings' || primary === 'glutes')) return 'posterior';
  return null;
}
