export const HIGH_VOLUME_THRESHOLD = 12;
export const OVERLOAD_THRESHOLD = 20;
export const HEAT_STEPS = [0, 1, 4, 8, 13] as const;

export function heatIntensity(sets: number): number {
  return sets <= 0 ? 0 : sets <= 3 ? .25 : sets <= 7 ? .45 : sets <= HIGH_VOLUME_THRESHOLD ? .7 : 1;
}

export function heatClass(sets: number): string {
  return { 0: 'fill-line', .25: 'fill-lime/25', .45: 'fill-lime/45', .7: 'fill-lime/70', 1: 'fill-lime' }[heatIntensity(sets)] ?? 'fill-line';
}
