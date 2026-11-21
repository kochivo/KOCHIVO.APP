export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION = 31.2;
export const CUTS = [0, 3.2, 7.2, 11.3, 15.5, 20.2, 24.5, 27.5, DURATION];
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const ease = value => 1 - (1 - clamp(value)) ** 3;
export const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
export function position(time) {
  const t = clamp(time, 0, DURATION - 0.001);
  const index = CUTS.findIndex((cut, i) => i < CUTS.length - 1 && t >= cut && t < CUTS[i + 1]);
  const elapsed = t - CUTS[index];
  const duration = CUTS[index + 1] - CUTS[index];
  return { index, elapsed, duration, progress: elapsed / duration };
}
