export function iftarCountdown(target: number, now: number) {
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}
