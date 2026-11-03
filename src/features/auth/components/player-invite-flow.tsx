'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useState, useTransition } from 'react';
import { Button, ErrorState, GlassCard, LoadingState, TextField } from '@/ui';
import { invitePreview } from '../data/invite-preview';
import { redeemInvite } from '../data/redeem-invite';
import { sendEmailCode } from '../data/send-email-code';
import { verifyEmailCode } from '../data/verify-email-code';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';
import { callAuthAction as runAuthAction } from '../data/client-action';
import { authError } from '../errors';

export function PlayerInviteFlow({ code, callbackError = false }: { code: string; callbackError?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof invitePreview>> | null>(null);
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(callbackError ? t('signInFailedTryAgain') : '');
  const [pending, start] = useTransition();
  useEffect(() => {
    let active = true;
    invitePreview(code).then((result) => { if (active) setPreview(result); })
      .catch((error: unknown) => { if (active) setPreview({ error: authError(error, locale) }); });
    return () => { active = false; };
  }, [code, retry, locale]);
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-6">
      {!preview ? <LoadingState /> : preview.error ? <ErrorState message={preview.error} retryLabel={t('tryAgain')} onRetry={() => { setPreview(null); setRetry((value) => value + 1); }} /> : <>
        <GlassCard className="p-4"><p>{t('coachInvitation', { name: preview.captainName ?? '' })}</p></GlassCard>
        <h1 className="text-3xl font-extrabold">{sent ? t('enterYourCode') : t('letSGetStarted')}</h1>
        {preview.signedIn ? <Button disabled={pending} size="lg" className="w-full" onClick={() => start(async () => {
          const result = await callAuthAction(() => redeemInvite(code)); setError(result.error ?? '');
          if (result.redirect) window.location.assign(result.redirect);
        })}>{pending ? t('connectingYourAccount') : t('continueWithYourCoach')}</Button> : <>
          {!sent && <><p className="text-muted">{t('noPasswordNeededChooseHowTo')}</p><GoogleButton intent="player" code={code} /><p className="text-center text-muted">{t('orUseEmail')}</p></>}
          <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await callAuthAction(() => sent ? verifyEmailCode({ email, token }, code) : sendEmailCode({ email }));
              setError(result.error ?? '');
              if (!result.error) setSent(true);
              if (result.redirect) window.location.assign(result.redirect);
            });
          }}>
            {sent ? <><p role="status">{t('weSentA6DigitCode')} <b dir="ltr">{email}</b></p><OtpInput value={token} onChange={setToken} disabled={pending} /></>
              : <TextField label={t('email')} type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />}
            <Button type="submit" size="lg" className="w-full" disabled={pending || (sent && token.length !== 6)}>{pending ? t('oneMoment') : sent ? t('continue') : t('sendMeACode')}</Button>
          </form>
          {sent && <Button variant="ghost" disabled={pending} onClick={() => { setSent(false); setToken(''); }}>{t('changeEmailOrSendAgain')}</Button>}
        </>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </>}
    </GlassCard>
  </main>;
}
