'use client';
import { clickableClass } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { languageOptions } from '@/core/i18n/language-options';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { deviceTimezone } from '@/lib/timezone';
import { TIMEZONE_CHANGED } from '@/core/timezone/timezone-provider';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { saveLanguage } from '../data/language';
import { saveCaptainPreferences } from '../data/preferences';
import { savePreference } from '../instant-save';
import type { SaveState } from '../instant-save';
import { timezones } from '../schema';
import type { SettingsProfile } from '../schema';
import { messages } from '../workspace/messages';
import { WorkspaceSaveStatus } from './workspace-save-status';

const chip = 'min-h-12 rounded-full border border-line-soft px-page-x text-row text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg-deep disabled:opacity-40';
export function WorkspacePreferences({ profile, update }: { profile: SettingsProfile; update: (value: SettingsProfile) => void }) {
  const t = useT(messages), locale = useLocale(), router = useRouter();
  const [language, setLanguage] = useState({ locale });
  const [state, setState] = useState<SaveState>('saved');
  const [error, setError] = useState('');
  const lock = useRef(false), retry = useRef<() => void>(() => {});
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setError(''); retry.current = () => void run(action);
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : t('error')); }
    finally { lock.current = false; }
  }
  function preference(patch: Pick<SettingsProfile, 'timezone' | 'timezone_auto' | 'units'>) {
    void run(async () => {
      await savePreference(profile, { ...profile, ...patch }, update, setState, () => saveCaptainPreferences(patch));
      window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGED, { detail: { ...profile, ...patch } }));
    });
  }
  function chooseLanguage(choice: LanguageChoice) {
    void run(async () => {
      await savePreference(language, { locale: choice.locale }, setLanguage, setState, async () => {
        await saveLanguage(choice); return {};
      });
      router.refresh();
    });
  }
  const zone = profile.timezone ?? DEFAULT_TIMEZONE, auto = profile.timezone_auto ?? true;
  const options = languageOptions();
  return <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
    <h2 className="mb-stack font-display text-title font-semibold">{t('preferences')}</h2>
    <fieldset disabled={state === 'saving'} className="space-y-inline">
      <legend className="mb-inline text-xs text-faint">{t('language')}</legend>
      <div className="mb-stack flex flex-wrap gap-inline">{options.map(choice => <button key={choice.label} type="button"
        className={`${clickableClass} ${chip}`}
        aria-pressed={language.locale === choice.locale}
        onClick={() => chooseLanguage(choice)}>{t(choice.label)}</button>)}</div>
      <p className="text-xs text-faint">{t('timezone')}</p>
      <div className="flex flex-wrap gap-inline"><button type="button" className={`${clickableClass} ${chip}`} aria-pressed={auto}
        onClick={() => preference({ timezone_auto: true, timezone: deviceTimezone() })}>{t('auto', { zone: zone === DEFAULT_TIMEZONE ? t('cairo') : zone })}</button>
        <button type="button" className={`${clickableClass} ${chip}`} aria-pressed={!auto} onClick={() => preference({ timezone_auto: false })}>{t('manual')}</button></div>
      {!auto && <select aria-label={t('timezone')} value={zone} onChange={event => preference({ timezone: event.target.value, timezone_auto: false })}
        className={`${editableFieldClass} min-h-12 w-full rounded-control border border-line bg-surface px-stack text-start`}>
        {Array.from(new Set([zone, ...timezones])).map(value => <option key={value}>{value}</option>)}
      </select>}
      <p className="pt-inline text-xs text-faint">{t('units')}</p><div className="flex flex-wrap gap-inline">{(['metric', 'imperial'] as const).map(units =>
        <button key={units} type="button" className={`${clickableClass} ${chip}`} aria-pressed={(profile.units ?? 'metric') === units} onClick={() => preference({ units })}>{t(units)}</button>)}</div>
    </fieldset>
    <WorkspaceSaveStatus state={state} error={error} retry={() => retry.current()} />
  </section>;
}
