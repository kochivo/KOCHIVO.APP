import { localDate } from './dates';
import { sunsetAndFajr } from './prayer-times';
import type { PrayerCity } from './prayer-times';
function shift(date: string, days: number) {
  return localDate(new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000), 'UTC');
}
export function ramadanSchedule(now: Date, city: PrayerCity, training: string, duration = 0) {
  const date = localDate(now, city.timezone), today = sunsetAndFajr(date, city);
  const previous = sunsetAndFajr(shift(date, -1), city), next = sunsetAndFajr(shift(date, 1), city);
  const overnight = now < today.fajr;
  const maghrib = overnight ? previous.maghrib : today.maghrib;
  const fajr = overnight ? today.fajr : next.fajr;
  const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60000);
  const workout = training === 'before_suhoor' ? at(fajr, -90)
    : at(maghrib, training === 'before_iftar_1h' ? -60 : training === 'after_taraweeh' ? 150 : 120);
  const items = [
    { key: 'suhoor' as const, at: at(overnight ? previous.fajr : today.fajr, -60) },
    { key: 'iftar' as const, at: maghrib }, { key: 'workout' as const, at: workout },
    { key: 'post_workout' as const, at: at(workout, duration + 15) },
    { key: 'nextSuhoor' as const, at: at(fajr, -60) },
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const current = items.findLast(item => item.at <= now)?.key;
  return { maghrib, fajr, workout, items, current, night: now >= maghrib && now < fajr,
    countdown: now < today.maghrib ? today.maghrib : next.maghrib };
}
