'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { savePlayerUnits } from '../data/player-units';
import { messages } from '../v6-messages';
import { messages as playerMessages } from '../player-messages';
import { PlayerTheme } from './player-theme';
import { PlayerReminder } from './player-reminder';
import { ChevronLeft, Ruler } from 'lucide-react';
import dynamic from 'next/dynamic';
const PrayerCity = dynamic(() => import('./prayer-city').then(m => m.PrayerCity));

export function PlayerPreferences({ units: initial, styleOnly = false }: { units: 'metric' | 'imperial'; styleOnly?: boolean }) {
  const t = useT(messages);
  const playerT = useT(playerMessages);
  const router = useRouter();
  const [units, setUnits] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  async function changeUnits(value: 'metric' | 'imperial') {
    if (lock.current || value === units) return;
    lock.current = true; setBusy(true); setError(false);
    const previous = units; setUnits(value);
    try { await savePlayerUnits(value); }
    catch { setUnits(previous); setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  const chip = 'min-h-12 rounded-full px-stack font-sans text-xs text-muted aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40';
  if (styleOnly) return null;
  return <section aria-label={playerT('settings')} className="space-y-card-gap" aria-busy={busy}>
    <div className="glass overflow-hidden rounded-card"><PlayerReminder /></div>
    <div className="glass divide-y divide-line-soft overflow-hidden rounded-card">
    {/* The player app always follows the phone's language; there is no in-app
        language chooser by product decision. */}
    <PlayerTheme />
    <PrayerCity />
    <div className="flex min-h-14 flex-wrap items-center gap-stack px-page-x max-[24rem]:gap-y-inline max-[24rem]:py-inline"><Ruler aria-hidden className="size-5 shrink-0 text-muted" /><span className="flex-1 text-sm font-bold">{playerT('units')}</span>
      <div role="group" aria-label={playerT('units')} className="flex max-w-full flex-wrap rounded-full bg-surface-raised p-inline max-[24rem]:basis-full">{(['metric', 'imperial'] as const).map(value =>
        <button key={value} type="button" disabled={busy} aria-pressed={value === units} onClick={() => void changeUnits(value)} className={chip}>{playerT(value)}</button>)}</div></div>
    <button type="button" className="flex min-h-14 w-full items-center gap-stack px-page-x text-start font-sans text-sm" onClick={() => {
      window.dispatchEvent(new Event('kochivo:replay-tour')); router.push('/player');
    }}><span className="flex-1">{playerT('guide')}</span><ChevronLeft aria-hidden className="dir-icon size-[18px] text-muted" /></button>
    {error && <p role="alert" className="px-page-x py-inline text-sm text-danger">{t('error')}</p>}
    </div>
  </section>;
}
