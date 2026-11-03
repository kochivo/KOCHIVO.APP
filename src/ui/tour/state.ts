export function nextVisibleStep(steps: readonly { target: string }[], current: number,
  direction: 1 | -1, visible: (target: string) => boolean): number | null {
  for (let index = current + direction; index >= 0 && index < steps.length; index += direction) {
    const step = steps[index];
    if (step && visible(step.target)) return index;
  }
  return null;
}

type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const tourKey = (userId: string) => `kochivo:tour:${userId}`;
export function tourDue(storage: TourStorage, userId: string, seenAt: string | null, demo: boolean) {
  return !demo && !seenAt && !storage.getItem(tourKey(userId));
}
export function rememberTour(storage: TourStorage, userId: string, now: string) {
  storage.setItem(tourKey(userId), now);
}
