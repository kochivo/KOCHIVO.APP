export function periodDay(starts: readonly string[], date: string): number | null {
  const latest = starts.filter(start => start <= date).sort().at(-1);
  return latest ? Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${latest}T12:00:00Z`)) / 86400000) : null;
}

export function isLightDay(enabled: boolean, starts: readonly string[], date: string, days: number, overrides: readonly string[]): boolean {
  const offset = periodDay(starts, date);
  return enabled && offset !== null && offset >= 0 && offset < days && !overrides.includes(date);
}
