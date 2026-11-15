'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/ui/toast';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
import { TextField } from '@/ui/text-field';
import { requestReset } from '../data/request-reset';
import { callAuthAction as runAuthAction } from '../data/client-action';
import { updatePassword } from '../data/update-password';
import { OtpInput } from './otp-input';
import { ResendCodeButton } from './resend-code-button';

export function ForgotPasswordFlow() {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [token, setToken] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  function send() {
    start(async () => {
      const result = await callAuthAction(() => requestReset({ email }));
      setError(result.error ?? '');
      if (!result.error) { setSent(true); setSentAt(Date.now()); setToken(''); setRecoveryReady(false); }
    });
  }
  return <main className="mesh flex min-h-dvh items-center justify-center p-section pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-section p-section">
      <h1 className="text-3xl font-extrabold">{sent ? t('checkYourEmail') : t('forgotPassword')}</h1>
      {sent ? <p role="status" className="break-words text-muted">{t('ifAnAccountExistsAReset')} <bdi>{email}</bdi></p>
        : <p className="text-muted">{t('enterYourEmailToGetA')}</p>}
      <form className="space-y-card-gap" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        if (!sent) { send(); return; }
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => updatePassword(input, recoveryReady ? undefined : { email, token }));
          setError(result.error ?? '');
          if (result.recoveryReady) setRecoveryReady(true);
          if (result.redirect) { toast.success(t('passwordUpdated')); router.push(result.redirect); router.refresh(); }
        });
      }}>
        {!sent && <TextField label={t('email')} type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required />}
        {sent && <>
          {!recoveryReady && <OtpInput value={token} onChange={setToken} disabled={pending} />}
          <p className="text-muted">{t('atLeast8CharactersWithA')}</p>
          <TextField label={t('newPasswordLabel')} name="password" type="password" autoComplete="new-password" minLength={8} required disabled={pending} />
          <TextField label={t('enterItAgain')} name="confirm" type="password" autoComplete="new-password" required disabled={pending} />
        </>}
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending || (sent && !recoveryReady && token.length !== 6)}>
          {pending ? t('oneMoment') : sent ? t('savePassword') : t('sendResetLink')}
        </Button>
      </form>
      {sent && <ResendCodeButton sentAt={sentAt} pending={pending} onResend={send} />}
      <Link href="/login" className="flex min-h-12 items-center text-lime">{t('backToSignIn')}</Link>
    </GlassCard>
  </main>;
}
