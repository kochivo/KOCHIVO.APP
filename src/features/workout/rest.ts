export function restRemaining(endsAt: number | null, now: number): number {
  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function restAnnouncement(remaining: number, started: boolean): string {
  if (!started) return '';
  if (remaining <= 0) return 'الراحة خلصت';
  return remaining <= 10 ? 'فاضل ١٠ ثواني أو أقل' : 'بدأت الراحة';
}

export function formatRest(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function extendRest(endsAt: number | null, now: number, seconds: number): number {
  return Math.max(endsAt ?? now, now) + seconds * 1000;
}
