'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { signInGoogle } from '../data/sign-in-google';
import { callAuthAction as runAuthAction } from '../data/client-action';
import { browserSelection } from '../package-selection';

export function GoogleButton({ intent, code, coach, returnTo }: {
  intent: 'captain' | 'player'; code?: string; coach?: string; returnTo?: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return <div className="space-y-inline">
    <Button variant="secondary" size="lg" className="w-full" disabled={pending} onClick={() => start(async () => {
      const result = await callAuthAction(() => returnTo ? signInGoogle(intent, code, coach, undefined, returnTo)
        : signInGoogle(intent, code, coach, coach ? browserSelection() : undefined));
      setError(result.error ?? '');
      if (result.redirect) window.location.assign(result.redirect);
    })}>{pending ? t('signingIn') : t('continueWithGoogle')}</Button>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </div>;
}
