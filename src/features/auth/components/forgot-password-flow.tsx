'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Button, GlassCard, TextField } from '@/ui';
import { requestReset } from '../data/request-reset';
import { callAuthAction as runAuthAction } from '../data/client-action';

export function ForgotPasswordFlow() {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  function send() {
    start(async () => {
      const result = await callAuthAction(() => requestReset({ email }));
      setError(result.error ?? '');
      if (!result.error) { setSent(true); setRemaining(60); }
    });
  }
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <h1 className="text-3xl font-extrabold">{sent ? t('checkYourEmail') : t('forgotPassword')}</h1>
      {sent ? <p role="status" className="text-muted">{t('ifAnAccountExistsAReset')}</p>
        : <p className="text-muted">{t('enterYourEmailToGetA')}</p>}
      <form className="space-y-4" aria-busy={pending} onSubmit={(event) => { event.preventDefault(); send(); }}>
        {!sent && <TextField label={t('email')} type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required />}
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending || remaining > 0}>
          {pending ? t('sending') : remaining ? t('resendAfter', { n: remaining }) : sent ? t('sendAgain') : t('sendResetLink')}
        </Button>
      </form>
      <Link href="/login" className="flex min-h-12 items-center text-lime">{t('backToSignIn')}</Link>
    </GlassCard>
  </main>;
}
