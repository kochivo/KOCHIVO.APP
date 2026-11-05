'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { LOCALES } from '@/core/i18n/locale';
import { setLocale } from '@/core/i18n/set-locale';
import { messages } from './messages';

export function LanguageSwitch({ compact = false }: { compact?: boolean } = {}) {
  const locale = useLocale();
  const t = useT(messages);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return <div>
    <div role="group" aria-label={t('language')} className="flex gap-1">
      {LOCALES.filter(value => !compact || value !== locale).map(value => <button key={value} type="button" lang={value}
        aria-pressed={compact ? undefined : locale === value} disabled={pending} className="min-h-12 rounded-control px-3 text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40"
        onClick={() => {
          if (value === locale) return;
          setError(false);
          start(async () => {
            try { await setLocale(value); router.refresh(); }
            catch { setError(true); }
          });
        }}>{t(value === 'ar' ? 'arabic' : 'english')}</button>)}
    </div>
    {error && <p role="alert" className="text-sm text-danger">{t('languageFailed')}</p>}
  </div>;
}
