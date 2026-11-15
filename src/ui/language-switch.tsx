'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { languageOptions } from '@/core/i18n/language-options';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { setLocale } from '@/core/i18n/set-locale';
import { messages } from './messages';

export function LanguageSwitch({ compact = false, onChange }: {
  compact?: boolean; onChange?: (choice: LanguageChoice) => Promise<void>;
} = {}) {
  const locale = useLocale();
  const t = useT(messages);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return <div>
    <div role="group" aria-label={t('language')} className="glass inline-flex flex-wrap gap-inline rounded-control border border-line-soft p-inline">
      {languageOptions().filter(value => !compact || value.locale !== locale).map(value => <button key={value.label} type="button" lang={value.locale}
        aria-pressed={compact ? undefined : locale === value.locale} disabled={pending} className="min-h-12 border border-line-soft rounded-control px-stack text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40"
        onClick={() => {
          if (value.locale === locale) return;
          setError(false);
          start(async () => {
            try {
              if (onChange) await onChange(value);
              else await setLocale(value.locale);
              router.refresh();
            }
            catch { setError(true); }
          });
        }}>{t(value.label)}</button>)}
    </div>
    {error && <p role="alert" className="text-sm text-danger">{t('languageFailed')}</p>}
  </div>;
}
