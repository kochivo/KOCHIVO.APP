// Forecast civil dates; local moon sightings can shift the boundary by one day.
const ranges = [
  { start: '2027-02-08', end: '2027-03-09' },
  { start: '2028-01-28', end: '2028-02-25' },
  { start: '2029-01-16', end: '2029-02-13' },
  { start: '2030-01-05', end: '2030-02-03' },
] as const;

export function ramadanRange(year: number) {
  return ranges.find(range => Number(range.start.slice(0, 4)) === year) ?? null;
}

export function ramadanDay(date: string): number | null {
  const range = ramadanRange(Number(date.slice(0, 4)));
  return range && date >= range.start && date <= range.end
    ? Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86400000) + 1 : null;
}

export function ramadanSettingsRange(date: string) {
  const day = Date.parse(`${date}T00:00:00Z`);
  return ranges.find(range => day >= Date.parse(`${range.start}T00:00:00Z`) - 14 * 86400000
    && day <= Date.parse(`${range.end}T00:00:00Z`));
}

export function ramadanSettingsVisible(date: string): boolean {
  return Boolean(ramadanSettingsRange(date));
}
