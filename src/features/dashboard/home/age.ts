type AgeKey = 'ageNow' | 'ageHours' | 'ageDays';
export function homeAge(at: string, now: Date, t: (key: AgeKey, values?: Record<string, string | number>) => string) {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(at)) / 3_600_000));
  if (hours === 0) return t('ageNow');
  if (hours < 24) return t('ageHours', { n: hours });
  return t('ageDays', { n: Math.floor(hours / 24) });
}
