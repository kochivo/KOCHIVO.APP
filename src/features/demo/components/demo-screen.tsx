'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { LanguageSwitch } from '@/ui/language-switch';
import { messages } from '../messages';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/ui';
import { useToast } from '@/ui/toast';
import { publicConfig } from '@/lib/public-config';
import { DemoHighlights } from './demo-highlights';
const TurnstileWidget = dynamic(() => import('./turnstile-widget').then(module => module.TurnstileWidget), {
  ssr: false, loading: () => <div aria-hidden className="min-h-16" />,
});

export function DemoScreen() {
  const t = useT(messages);
  const locale = useLocale();
  const toast = useToast();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const captchaError = useCallback(() => {
    setToken(''); setError(t('completeTheVerificationAndTryAgain'));
  }, [t]);
  const siteKey = publicConfig.turnstileSiteKey;
  const start = async (role: 'captain' | 'player') => {
    setPending(true); setError('');
    let failure: string | undefined;
    try {
      const { startDemo } = await import('../data/start-demo');
      failure = await startDemo((path) => window.location.assign(path), token || undefined, locale, Date.now, role);
    } catch { failure = t('theDemoIsUnavailableRightNow'); }
    finally { setPending(false); }
    if (failure) {
      setError(failure); setToken(''); setAttempt((value) => value + 1); toast.error(failure);
    }
  };
  return <main className="mx-auto grid min-h-dvh max-w-lg content-center items-center gap-6 p-6 pt-[max(1.5rem,var(--safe-top))] lg:max-w-5xl lg:grid-cols-2">
    <section className="glass-strong w-full space-y-5 rounded-card p-6">
      <LanguageSwitch />
      <h1 className="text-3xl font-extrabold">{t('tryTheDemo')}</h1>
      <p className="text-muted">{t('exploreTheCoachWorkspaceWithSample')}</p>
      {siteKey && <TurnstileWidget key={attempt} siteKey={siteKey} onToken={setToken} onError={captchaError} />}
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-12 flex-1" disabled={pending || Boolean(siteKey && !token)}
          onClick={() => start('captain')}>{pending ? t('preparingTheDemo') : t('openDemo')}</Button>
        <Button variant="secondary" className="min-h-12 flex-1" disabled={pending || Boolean(siteKey && !token)}
          onClick={() => start('player')}>{t('tryAsPlayer')}</Button>
      </div>
      <p className="text-sm text-muted">{t('sampleAccountClearsAfter24Hours')}</p>
      {pending && <p role="status" className="text-sm text-muted">{t('preparingSampleData')}</p>}
      {error && <div role="alert" className="space-y-2 text-sm text-danger"><p>{error}</p>
        <Button variant="secondary" className="min-h-12" disabled={pending} onClick={() => {
          setError(''); setToken(''); setAttempt((value) => value + 1);
        }}>{t('tryAgain')}</Button>
      </div>}
    </section>
    <DemoHighlights />
  </main>;
}
