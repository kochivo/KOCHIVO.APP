'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { NutritionMeal, MealLogRow } from '@/core/offline';
import { useRamadan } from '@/lib/use-ramadan';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { PRAYER_CITIES, defaultCityForTimezone } from '@/lib/prayer-times';
import { ramadanSchedule } from '@/lib/ramadan-schedule';
import { groupRamadanMeals } from '../ramadan-slots';
import type { RamadanSlot } from '../ramadan-slots';
import { MealCard } from './meal-card';
import { messages } from '../ramadan/messages';
import { useRamadanDuration } from '../hooks/use-ramadan-duration';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
export function RamadanMeals({ meals, logs, today, title }: { meals: NutritionMeal[]; logs: MealLogRow[]; today: string; title: string }) {
  const resource = useRamadan(), { now } = useCalendarClock(), t = useT(messages), locale = useLocale();
  const duration = useRamadanDuration(today);
  if (!resource.data?.active || !now) return null;
  const status = resource.data, city = PRAYER_CITIES.find(city => city.code === status.city) ?? defaultCityForTimezone(status.timezone);
  const schedule = ramadanSchedule(now, city, status.training, duration ?? 0);
  const times = { iftar: schedule.maghrib, post_workout: schedule.items.find(item => item.key === 'post_workout')?.at ?? schedule.workout,
    suhoor: schedule.items.find(item => item.key === 'nextSuhoor')?.at ?? schedule.fajr };
  const groups = groupRamadanMeals(meals as (NutritionMeal & { ramadan_slot?: RamadanSlot | null })[]);
  const slots = ['iftar', 'post_workout', 'suhoor'] as const;
  const v4 = captainWorkspaceEnabled();
  const next = v4 ? slots.flatMap(slot => groups[slot]).find(meal => meal.items.length && !logs.some(log =>
    log.meal_id === meal.id && log.log_date === today && log.completed_at && !log.deleted_at)) : undefined;
  return <section data-food-section={v4 ? 'meals' : undefined} className="space-y-card-gap">
    <span className="rounded-full border border-line px-stack py-inline text-xs">{t('ramadan')}</span>
    {slots.map(slot => groups[slot].length > 0 && <section key={slot} className="space-y-stack">
      <h2 className="text-title font-semibold">{t(slot)} · <bdi dir="ltr">{times[slot].toLocaleTimeString(locale, { timeZone: city.timezone, hour: '2-digit', minute: '2-digit' })}</bdi></h2>
      <ul className="space-y-stack">{groups[slot].map(meal => <li key={meal.id}><MealCard meal={meal} today={today} planTitle={title} primary={meal.id === next?.id}
        log={logs.find(log => log.meal_id === meal.id && log.log_date === today && !log.deleted_at)} /></li>)}</ul>
    </section>)}
    <p className="glass rounded-card p-card text-row text-muted">{t('tip')}</p>
  </section>;
}
