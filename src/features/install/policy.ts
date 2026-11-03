import type { InstallPlatform } from './platform';

export function shouldShowInstall({ finishedWorkouts, platform, dismissals, lastDismissedAt, now }: {
  finishedWorkouts: number; platform: InstallPlatform; dismissals: number;
  lastDismissedAt: number | null; now: number;
}): boolean {
  return finishedWorkouts >= 1 && platform !== 'installed' && platform !== 'unsupported' &&
    dismissals < 3 && (lastDismissedAt === null || now - lastDismissedAt >= 7 * 24 * 60 * 60 * 1000);
}
