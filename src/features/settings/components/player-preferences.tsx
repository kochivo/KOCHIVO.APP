'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { languageOptions } from '@/core/i18n/language-options';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { saveLanguage } from '../data/language';
import { savePlayerUnits } from '../data/player-units';
import { messages } from '../v6-messages';

export function PlayerPreferences({ units: initial }: { units: 'metric' | 'imperial' }) {
  const t = useT(messages);
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
  const chip = 'min-h-12 rounded-full border border-line-soft px-4 text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg-deep disabled:opacity-40';
  return <section className="glass space-y-3 rounded-card border border-line-soft p-5" aria-busy={busy}>
    <h2 className="text-xs text-faint">{t('language')}</h2>
    <div role="group" aria-label={t('language')} className="flex flex-wrap gap-2">{languageOptions().map(choice =>
      <button key={choice.label} type="button" lang={choice.locale} disabled={busy}
        aria-pressed={choice.locale === locale && (!choice.style || choice.style === style)}
        onClick={() => void changeLanguage(choice)} className={chip}>{t(choice.label)}</button>)}</div>
    <h2 className="text-xs text-faint">{t('units')}</h2>
    <div role="group" aria-label={t('units')} className="flex gap-2">{(['metric', 'imperial'] as const).map(value =>
      <button key={value} type="button" disabled={busy} aria-pressed={value === units} onClick={() => void changeUnits(value)} className={chip}>{t(value)}</button>)}</div>
    {error && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
  </section>;
}
