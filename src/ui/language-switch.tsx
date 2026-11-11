'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { languageOptions } from '@/core/i18n/language-options';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { setLocale } from '@/core/i18n/set-locale';
import { messages } from './messages';

export function LanguageSwitch({ compact = false, onChange }: {
  compact?: boolean; onChange?: (choice: LanguageChoice) => Promise<void>;
} = {}) {
  const locale = useLocale();
  const style = useArabicStyle();
  const t = useT(messages);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return <div>
    <div role="group" aria-label={t('language')} className="flex gap-1">
      {languageOptions().filter(value => !compact || value.locale !== locale || (value.style && value.style !== style)).map(value => <button key={value.label} type="button" lang={value.locale}
        aria-pressed={compact ? undefined : locale === value.locale && (!value.style || value.style === style)} disabled={pending} className="min-h-12 rounded-control px-3 text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40"
        onClick={() => {
          if (value.locale === locale && (!value.style || value.style === style)) return;
          setError(false);
          start(async () => {
            try {
              if (onChange) await onChange(value);
              else if (value.style) await setLocale(value.locale, value.style);
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
