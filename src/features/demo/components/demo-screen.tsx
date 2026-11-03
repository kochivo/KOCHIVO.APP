'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { LanguageSwitch } from '@/ui/language-switch';
import { messages } from '../messages';
import { useCallback, useState } from 'react';
import { Button } from '@/ui';
import { publicConfig } from '@/lib/public-config';
import { startDemo } from '../data/start-demo';
import { TurnstileWidget } from './turnstile-widget';

export function DemoScreen() {
  const t = useT(messages);
  const locale = useLocale();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const captchaError = useCallback(() => {
    setToken(''); setError(t('completeTheVerificationAndTryAgain'));
  }, [t]);
  const siteKey = publicConfig.turnstileSiteKey;
  return <main className="mx-auto flex min-h-dvh max-w-lg items-center p-6">
    <section className="glass-strong w-full space-y-5 rounded-card p-6">
      <LanguageSwitch />
      <h1 className="text-3xl font-extrabold">{t('tryTheDemo')}</h1>
      <p className="text-muted">{t('exploreTheCoachWorkspaceWithSample')}</p>
      {siteKey && <TurnstileWidget key={attempt} siteKey={siteKey} onToken={setToken} onError={captchaError} />}
      <Button className="min-h-12 w-full" disabled={pending || Boolean(siteKey && !token)} onClick={async () => {
        setPending(true); setError('');
        const failure = await startDemo((path) => window.location.assign(path), token || undefined, locale);
        if (failure) {
          setError(failure); setPending(false); setToken(''); setAttempt((value) => value + 1);
        }
      }}>{pending ? t('preparingTheDemo') : t('openDemo')}</Button>
      <p className="text-sm text-muted">{t('sampleAccountClearsAfter24Hours')}</p>
      {pending && <p role="status" className="text-sm text-muted">{t('preparingSampleData')}</p>}
      {error && <div role="alert" className="space-y-2 text-sm text-danger"><p>{error}</p>
        <Button variant="ghost" className="min-h-12" disabled={pending} onClick={() => {
          setError(''); setToken(''); setAttempt((value) => value + 1);
        }}>{t('tryAgain')}</Button>
      </div>}
    </section>
  </main>;
}
