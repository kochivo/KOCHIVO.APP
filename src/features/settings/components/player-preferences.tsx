'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { languageOptions } from '@/core/i18n/language-options';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { saveLanguage } from '../data/language';
import { savePlayerUnits } from '../data/player-units';
import { messages } from '../v6-messages';
import { messages as playerMessages } from '../player-messages';
import { PlayerTheme } from './player-theme';
import { PlayerReminder } from './player-reminder';
import { ChevronLeft } from 'lucide-react';

export function PlayerPreferences({ units: initial, styleOnly = false }: { units: 'metric' | 'imperial'; styleOnly?: boolean }) {
  const t = useT(messages);
  const playerT = useT(playerMessages);
  const locale = useLocale();
  const style = useArabicStyle();
  const router = useRouter();
  const [units, setUnits] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  async function changeLanguage(choice: LanguageChoice) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try { await saveLanguage(choice); router.refresh(); }
    catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  async function changeUnits(value: 'metric' | 'imperial') {
    if (lock.current || value === units) return;
    lock.current = true; setBusy(true); setError(false);
    const previous = units; setUnits(value);
    try { await savePlayerUnits(value); }
    catch { setUnits(previous); setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  const chip = 'min-h-12 rounded-full px-3 font-sans text-xs text-muted aria-pressed:bg-ink aria-pressed:font-extrabold aria-pressed:text-bg disabled:opacity-40';
  const choices = languageOptions();
  if (styleOnly) return <div className="flex min-h-[60px] flex-wrap items-center gap-3 px-4 py-2" aria-busy={busy}>
    <span className="flex-1 text-sm">{playerT('style')}</span>
    <div role="group" aria-label={playerT('style')} className="flex rounded-full bg-surface-raised p-[3px]">{choices.filter(choice => choice.locale === 'ar').map(choice =>
      <button key={choice.label} type="button" lang={choice.locale} disabled={busy}
        aria-pressed={choice.locale === locale && (!choice.style || choice.style === style)}
        onClick={() => void changeLanguage(choice)} className={chip}>{t(choice.label)}</button>)}</div>
    {error && <p role="alert" className="w-full text-sm text-danger">{t('error')}</p>}
  </div>;
  return <section aria-label={playerT('settings')} className="divide-y divide-line-soft overflow-hidden rounded-[24px] border border-line-soft bg-surface" aria-busy={busy}>
    <div className="flex min-h-[60px] items-center gap-3 px-4"><span className="flex-1 text-sm">{playerT('language')}</span>
      <div role="group" aria-label={playerT('language')} className="flex rounded-full bg-surface-raised p-[3px]">{(['ar', 'en'] as const).map(value => {
        const choice = choices.find(option => option.locale === value && (!option.style || option.style === style)) ?? choices.find(option => option.locale === value);
        return choice && <button key={value} type="button" lang={value} disabled={busy} aria-pressed={locale === value}
          onClick={() => void changeLanguage(choice)} className={chip}>{playerT(value === 'ar' ? 'arabic' : 'english')}</button>;
      })}</div></div>
    <PlayerTheme /><PlayerReminder />
    <div className="flex min-h-[60px] items-center gap-3 px-4"><span className="flex-1 text-sm">{playerT('units')}</span>
      <div role="group" aria-label={playerT('units')} className="flex rounded-full bg-surface-raised p-[3px]">{(['metric', 'imperial'] as const).map(value =>
        <button key={value} type="button" disabled={busy} aria-pressed={value === units} onClick={() => void changeUnits(value)} className={chip}>{playerT(value)}</button>)}</div></div>
    <button type="button" className="flex min-h-[60px] w-full items-center gap-3 px-4 text-start font-sans text-sm" onClick={() => {
      window.dispatchEvent(new Event('kochivo:replay-tour')); router.push('/player');
    }}><span className="flex-1">{playerT('guide')}</span><ChevronLeft aria-hidden className="dir-icon size-[18px] text-muted" /></button>
    {error && <p role="alert" className="px-4 py-2 text-sm text-danger">{t('error')}</p>}
  </section>;
}
