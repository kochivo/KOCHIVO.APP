type AgeKey = 'ageNow' | 'ageHour' | 'ageTwoHours' | 'ageHours' | 'ageHoursMany' | 'ageDay' | 'ageTwoDays' | 'ageDays' | 'ageDaysMany';
export function homeAge(at: string, now: Date, t: (key: AgeKey, values?: Record<string, string | number>) => string) {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(at)) / 3_600_000));
  if (hours === 0) return t('ageNow');
  if (hours === 1) return t('ageHour');
  if (hours === 2) return t('ageTwoHours');
  if (hours < 24) return t(hours <= 10 ? 'ageHours' : 'ageHoursMany', { n: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('ageDay') : days === 2 ? t('ageTwoDays') : t(days <= 10 ? 'ageDays' : 'ageDaysMany', { n: days });
}
