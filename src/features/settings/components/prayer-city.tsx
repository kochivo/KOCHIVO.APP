'use client';
import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { PRAYER_CITIES, defaultCityForTimezone } from '@/lib/prayer-times';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { useRamadan } from '../hooks/use-ramadan';
import { savePrayerCity } from '../data/ramadan';
import { messages } from '../ramadan/messages';
import { messages as cities } from '@/lib/prayer-cities/messages';
export function PrayerCity() {
  const resource = useRamadan(), t = useT(messages), ct = useT(cities), timezone = useTimezone();
  const [error, setError] = useState(false), [busy, setBusy] = useState(false), lock = useRef(false);
  async function change(value: string) {
    if (!resource.data || lock.current) return;
    const previous = resource.data;
    lock.current = true; setBusy(true); setError(false);
    try {
      if (!await resource.mutate(current => ({ ...previous, ...current, city: value || null }), () => savePrayerCity(value || null))) setError(true);
    } finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-stack p-card">
    {resource.data ? <label className="block space-y-inline">{t('city')}<select disabled={busy} value={resource.data.city ?? ''}
      onChange={event => void change(event.target.value)} className="press min-h-12 w-full cursor-pointer rounded-control border border-line bg-surface px-stack focus-visible:ring-2 focus-visible:ring-lime">
      <option value="">{t('automatic')} · {ct(defaultCityForTimezone(timezone).code as keyof typeof cities.ar)}</option>
      {PRAYER_CITIES.map(city => <option key={city.code} value={city.code}>{ct(city.code as keyof typeof cities.ar)}</option>)}
    </select></label> : !resource.error && <LoadingState variant="detail" />}
    {Boolean(error || resource.error) && <><p role="alert" className="text-danger">{t('error')}</p><Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></>}
  </div>;
}
