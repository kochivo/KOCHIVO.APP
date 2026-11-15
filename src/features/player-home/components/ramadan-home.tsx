'use client';
import { useCallback, useRef, useState } from 'react';
import { CupSoda } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb } from '@/core/offline';
import { saveDailyCheck } from '@/features/readiness';
import type { RamadanStatus } from '@/features/settings';
import { PRAYER_CITIES, defaultCityForTimezone } from '@/lib/prayer-times';
import { ramadanDay } from '@/lib/ramadan-calendar';
import { ramadanSchedule } from '@/lib/ramadan-schedule';
import { localDate } from '@/lib/dates';
import { Button } from '@/ui/button';
import { messages } from '../ramadan/messages';
import { useRamadanWater } from '../hooks/use-ramadan-water';
import { completedCups, nextCupMl } from '../ramadan-water';
import { IftarCountdown } from './iftar-countdown';
import { messages as cityMessages } from '@/lib/prayer-cities/messages';

export function RamadanHome({ status, now, playerId, duration = 0 }: {
  status: RamadanStatus & { city: string | null; timezone: string }; now: Date; playerId?: string; duration?: number;
}) {
  const t = useT(messages), locale = useLocale(), lock = useRef(false), [error, setError] = useState(false);
  const ct = useT(cityMessages);
  const city = PRAYER_CITIES.find(city => city.code === status.city) ?? defaultCityForTimezone(status.timezone);
  const schedule = ramadanSchedule(now, city, status.training, duration), date = localDate(now, city.timezone);
  const sunsetDate = localDate(schedule.maghrib, city.timezone), night = schedule.night;
  const onError = useCallback(() => setError(true), []);
  const water = useRamadanWater(playerId, date, sunsetDate, night, onError);
  if (!status.active || ramadanDay(date) === null) return null;
  const time = (date: Date) => date.toLocaleTimeString(locale, { timeZone: city.timezone, hour: '2-digit', minute: '2-digit' });
  const cups = schedule.night ? completedCups(status.water_ml, water ?? 0) : 0;
  async function drink() {
    if (!playerId || !schedule.night || lock.current) return;
    lock.current = true; setError(false);
    try { await saveDailyCheck(localDb(), playerId, {}, nextCupMl(status.water_ml, water ?? 0), now.getTime(), city.timezone); }
    catch { setError(true); } finally { lock.current = false; }
  }
  return <section className="space-y-card-gap">
    <div className="glass-strong flex flex-col gap-stack rounded-card p-card text-center">
      <p>{t('day', { n: ramadanDay(date) ?? 1 })}</p><IftarCountdown target={schedule.countdown.getTime()} initialNow={now.getTime()} />
      <p className="text-muted">{t('iftarClock')} · {ct(city.code as keyof typeof cityMessages.ar)} · <bdi>{time(schedule.countdown)}</bdi></p>
    </div>
    <h2 className="text-title font-semibold">{t('yourDay')}</h2>
    <ol className="space-y-stack">{schedule.items.filter(item => duration > 0 || (item.key !== 'workout' && item.key !== 'post_workout')).map(item => <li key={item.key} className={`flex items-center gap-stack ${schedule.current === item.key ? 'text-lime' : 'text-muted'}`}>
      <bdi className="font-display tabular-nums" dir="ltr">{time(item.at)}</bdi><span>{t(item.key, { n: duration })}</span>
    </li>)}</ol>
    <h2 className="text-title font-semibold">{t('water')}</h2>
    <div role="img" aria-label={t('cups', { n: cups })} className="flex gap-inline">{Array.from({ length: 8 }, (_, index) => <CupSoda key={index} aria-hidden className={`size-7 ${index < cups ? 'text-lime' : 'text-muted'}`} />)}</div>
    <p className="text-row text-muted">{t('cups', { n: cups })} · {t('remaining', { n: Math.max(0, Math.ceil((schedule.fajr.getTime() - 3600000 - now.getTime()) / 3600000)) })}</p>
    {error && <p role="alert" className="text-danger">{t('waterError')}</p>}
    <Button variant="secondary" block disabled={!schedule.night || !playerId} onClick={() => void drink()}>{t('drink')}</Button>
  </section>;
}
