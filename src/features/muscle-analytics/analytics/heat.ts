export const HIGH_VOLUME_THRESHOLD = 12;

export function heatIntensity(sets: number): number {
  return sets <= 0 ? 0 : sets <= 5 ? .3 : sets <= HIGH_VOLUME_THRESHOLD ? .65 : 1;
}

export function heatClass(sets: number): string {
  if (sets <= 0) return 'fill-none';
  if (sets <= 5) return 'fill-lime/20';
  if (sets <= 12) return 'fill-lime';
  return 'fill-lime shadow-lime-glow drop-shadow-[0_0_6px_var(--color-lime)]';
}
