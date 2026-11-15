'use client';

import { useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import './globals.css';
import { LocaleProvider, useT } from '@/core/i18n/client';
import { DEFAULT_LOCALE, localeDir } from '@/core/i18n/locale';
import { messages } from '@/ui/messages';
import { publicConfig } from '@/lib/public-config';
import { Button } from '@/ui/button';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = DEFAULT_LOCALE;
  useEffect(() => {
    if (publicConfig.sentryDsn) captureException(error);
  }, [error]);

  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body>
        <LocaleProvider locale={locale}><ErrorPanel reset={reset} /></LocaleProvider>
      </body>
    </html>
  );
}

function ErrorPanel({ reset }: { reset: () => void }) {
  const t = useT(messages);
  return (
        <main className="flex min-h-dvh items-center justify-center p-6 text-start">
          <section className="glass-strong w-full max-w-md rounded-card p-6">
            <h1 className="text-2xl font-bold text-ink">{t('somethingWentWrong')}</h1>
            <p className="mt-3 text-muted">{t('tryAgainToContinue')}</p>
            <Button type="button" onClick={reset}
              variant={'primary'} block={false} className={"mt-6 min-h-12 w-full px-6 font-bold"}>
              {t('tryAgain')}
            </Button>
          </section>
        </main>
  );
}
