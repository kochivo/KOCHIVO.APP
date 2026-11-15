import type { SetLogRow } from '@/core/offline';
import { detectPr } from '../pr';
import { intlLocale, type Locale } from '@/core/i18n/locale';

export const effortChoices = [
  { key: 'v3Easy', value: 3 }, { key: 'v3Right', value: 6 }, { key: 'v3Hard', value: 9 },
] as const;

export function formatVolume(kilograms: number, locale: Locale) {
  const tons = kilograms >= 1000;
  const value = new Intl.NumberFormat(locale === 'ar' ? 'en-US' : intlLocale(locale), {
    minimumFractionDigits: tons ? 1 : 0, maximumFractionDigits: tons ? 1 : 0,
  }).format(tons ? kilograms / 1000 : kilograms);
  return { value, unit: tons ? 'v3Ton' : 'v3VolumeKg' } as const;
}

export function sessionRecords(rows: readonly SetLogRow[], sessionId: string) {
  const live = rows.filter(row => !row.deleted_at);
  return live.filter(row => row.session_id === sessionId && detectPr(live.filter(previous =>
    previous.exercise_id === row.exercise_id && previous.completed_at < row.completed_at), row));
}
