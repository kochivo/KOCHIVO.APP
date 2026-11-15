'use client';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { LoadingState } from '@/ui/loading-state';
import { ErrorState } from '@/ui/error-state';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { localDate } from '@/lib/dates';
import { useTimezone } from '@/core/timezone/client';
import { loadRamadanTeam } from '../data/ramadan';
import { messages } from '../ramadan/messages';
import { RamadanControls } from './ramadan-controls';
import { ramadanSettingsVisible } from '@/lib/ramadan-calendar';
import { useEffect } from 'react';
export function RamadanSettings({ today }: { today?: string }) {
  const t = useT(messages);
  const { now } = useCalendarClock();
  const timezone = useTimezone();
  const date = today ?? (now ? localDate(now, timezone) : '');
  const visible = ramadanSettingsVisible(date);
  const resource = useResource(visible ? 'settings:ramadan:team' : null, loadRamadanTeam);
  useEffect(() => {
    if (visible && window.location.hash === '#ramadan') document.getElementById('ramadan')?.scrollIntoView({ block: 'start' });
  }, [visible]);
  if (!visible) return null;
  return <section id="ramadan" className="glass scroll-mt-section rounded-card border border-line-soft p-card">
    <h2 className="mb-stack font-display text-title font-semibold">{t('title')}</h2>
    {resource.data ? <RamadanControls initial={resource.data} today={date}
      save={next => resource.mutate(() => next, () => import('../data/ramadan').then(m => m.saveRamadanTeam({ ...next.preferences, exempt: next.exempt })))} />
      : resource.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void resource.retry()} /> : <LoadingState variant="detail" />}
  </section>;
}
