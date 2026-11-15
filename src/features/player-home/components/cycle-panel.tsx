'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useCycle } from '../hooks/use-cycle';
import { logCycle, writeCycle } from '../data/cycle';
import type { CycleData, CycleSettings } from '../data/cycle';
import { isLightDay, periodDay } from '../light-day';
import { shiftDate } from '../streak';
import { messages } from '../cycle/messages';
import { CycleSettingsForm } from './cycle-settings-form';
import { formatDateAr } from '@/lib/dates';

export function CyclePanel({ playerId, today, settings = false, workout = false }: {
  playerId: string; today: string; settings?: boolean; workout?: boolean;
}) {
  const resource = useCycle(playerId);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useT(messages);
  const locale = useLocale();
  const data = resource.data;
  // Never expose cycle text until intake explicitly confirms eligibility.
  if (!data?.female) return null;
  if (data.failed) return <div role="alert" className="glass space-y-stack rounded-card p-card"><p>{t('error')}</p>
    <Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div>;
  const s = data.settings;
  const light = isLightDay(s.enabled, data.starts, today, s.light_days, data.overrides);
  const eligible = isLightDay(s.enabled, data.starts, today, s.light_days, []);
  async function mutate(next: CycleData, commit: () => Promise<unknown>) {
    setBusy(true); setFailed(false);
    try { if (!await resource.mutate(() => next, commit)) setFailed(true); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  }
  const save = (patch: Partial<CycleSettings>) => data && mutate({ ...data, settings: { ...s, ...patch } }, () => writeCycle(playerId, patch));
  if (workout && !s.enabled) return null;
  if (!settings && s.asked_at && !s.enabled) return null;
  return <section className="glass space-y-stack rounded-card p-card" aria-label={t('title')}>
    {failed && <p role="alert" className="text-danger">{t('error')}</p>}
    <fieldset disabled={busy} className="space-y-stack">
      {settings ? <CycleSettingsForm value={s} onSave={save} /> : !s.asked_at ? <>
        <h2 className="text-title font-semibold">{t('prompt')}</h2>
        <div className="flex gap-stack"><Button variant="secondary" onClick={() => void save({ enabled: true, asked_at: new Date().toISOString() })}>{t('yes')}</Button>
          <Button variant="secondary" onClick={() => void save({ enabled: false, asked_at: new Date().toISOString() })}>{t('no')}</Button></div>
      </> : <>
        <div className="flex flex-wrap justify-between gap-stack"><h2 className="font-semibold">{t('title')}</h2><span className="rounded-full bg-surface-raised px-stack py-inline text-xs text-muted">{t('privacy')}</span></div>
        {!workout && <><ol className="grid grid-cols-7 gap-inline">{Array.from({ length: 7 }, (_, index) => {
          const date = shiftDate(today, index - 2);
          const day = periodDay(data.starts, date);
          return <li key={date} className={`rounded-control py-inline text-center text-micro ${day !== null && day < s.avg_period_days ? 'bg-rose/15 text-rose' : 'text-muted'} ${date === today ? 'ring-2 ring-lime' : ''}`}>
            <time dateTime={date} aria-current={date === today ? 'date' : undefined} aria-label={formatDateAr(date, { dateStyle: 'long' }, locale)} className="flex flex-col items-center gap-inline">
              <span>{formatDateAr(date, { weekday: 'short' }, locale)}</span><bdi className="text-sm font-semibold">{formatDateAr(date, { day: 'numeric' }, locale)}</bdi>
            </time></li>;
        })}</ol><Button variant="secondary" onClick={() => void mutate({ ...data, starts: [...new Set([...data.starts, today])] }, () => logCycle(playerId, today))}>{t('log')}</Button></>}
        {light && <div className="glass-strong space-y-inline rounded-control p-card"><p className="text-rose">{t('light')}</p><p className="text-sm text-muted">{t('hint')}</p></div>}
        {eligible && <label className="flex min-h-12 cursor-pointer items-center justify-between gap-stack">{t('usual')}<input type="checkbox" role="switch" className="size-6 cursor-pointer accent-lime focus-visible:ring-2 focus-visible:ring-lime" checked={data.overrides.includes(today)} onChange={event => {
          const checked = event.target.checked;
          void mutate({ ...data, overrides: checked ? [...data.overrides, today] : data.overrides.filter(day => day !== today) }, () => logCycle(playerId, today, true, !checked));
        }} /></label>}
        <p className="text-xs text-muted">{t('captain')}</p>
      </>}
    </fieldset>
  </section>;
}
