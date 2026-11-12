import type { DayWarmup } from '@/features/programs';

export type WarmupProgress = { checked: string[]; skipped: boolean };
const emptyProgress = (): WarmupProgress => ({ checked: [], skipped: false });

export function readWarmupProgress(storage: Pick<Storage, 'getItem'>, sessionId: string): WarmupProgress {
  try {
    const value: unknown = JSON.parse(storage.getItem(`warmup:${sessionId}`) ?? 'null');
    if (value && typeof value === 'object' && 'checked' in value && Array.isArray(value.checked) &&
      value.checked.every((id: unknown) => typeof id === 'string') && 'skipped' in value && typeof value.skipped === 'boolean') {
      return { checked: value.checked, skipped: value.skipped };
    }
  } catch { /* Browser storage may be blocked; skipping must still allow the workout. */ }
  return emptyProgress();
}

export function saveWarmupProgress(storage: Pick<Storage, 'setItem'>, sessionId: string, progress: WarmupProgress): void {
  try { storage.setItem(`warmup:${sessionId}`, JSON.stringify(progress)); }
  catch { /* Keep optimistic progress usable for this visit when storage is unavailable. */ }
}

export function warmupPending(warmup: DayWarmup, progress: WarmupProgress): boolean {
  return !progress.skipped && warmup.items.some(item => !progress.checked.includes(item.id));
}
