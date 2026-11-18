'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useId, useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { GlassCard } from '@/ui/glass-card';
import { LoadingState } from '@/ui/loading-state';
import { TextField } from '@/ui/text-field';
import { invitePreview } from '../data/invite-preview';
import { redeemInvite } from '../data/redeem-invite';
import { sendEmailCode } from '../data/send-email-code';
import { verifyEmailCode } from '../data/verify-email-code';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';
import { callAuthAction as runAuthAction } from '../data/client-action';
import { SignOutButton } from './sign-out-button';
import { authError } from '../errors';

export function PlayerInviteFlow({ code, callbackError = false }: { code: string; callbackError?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof invitePreview>> | null>(null);
  const destinationId = useId();
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(callbackError ? t('signInFailedTryAgain') : '');
  const [pending, start] = useTransition();
  useEffect(() => {
    let active = true;
    invitePreview(code).then((result) => { if (active) setPreview(result); })
      .catch((error: unknown) => { if (active) setPreview({ error: authError(error, t) }); });
    return () => { active = false; };
  }, [code, retry, t]);
  function applyInviteIssue(result: { error?: string; inviteIssue?: 'invalid' | 'coach' }) {
    setError(result.error ?? '');
    if (result.inviteIssue) setPreview({ error: result.error ?? t('inviteIsInvalidOrExpired'), inviteIssue: result.inviteIssue });
  }
  return <main className="mesh flex min-h-dvh items-center justify-center p-section pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-section p-section">
      {!preview ? <LoadingState /> : preview.inviteIssue ? <>
        <p role="alert" className="text-danger">{preview.error}</p>
        {preview.inviteIssue === 'coach' ? <SignOutButton inviteCode={code} label={t('switchAccount')} /> : <p className="text-muted">{t('askForNewInvite')}</p>}
      </> : preview.error ? <ErrorState message={preview.error} retryLabel={t('tryAgain')} onRetry={() => { setPreview(null); setRetry((value) => value + 1); }} /> : <>
        <GlassCard className="p-card"><p>{t('coachInvitation', { name: preview.captainName ?? '' })}</p></GlassCard>
        <h1 className="text-3xl font-extrabold">{sent ? t('enterYourCode') : t('letSGetStarted')}</h1>
        {preview.signedIn ? <Button disabled={pending} size="lg" className="w-full" onClick={() => start(async () => {
          const result = await callAuthAction(() => redeemInvite(code)); applyInviteIssue(result);
          if (result.redirect) window.location.assign(result.redirect);
        })}>{pending ? t('connectingYourAccount') : t('continueWithYourCoach')}</Button> : <>
          {!sent && <><p className="text-muted">{t('noPasswordNeededChooseHowTo')}</p><GoogleButton intent="player" code={code} /><p className="text-center text-muted">{t('orUseEmail')}</p></>}
          <form className="space-y-card-gap" aria-busy={pending} onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await callAuthAction(() => sent ? verifyEmailCode({ email, token }, code) : sendEmailCode({ email }));
              applyInviteIssue(result);
              if (!result.error) setSent(true);
              if (result.redirect) window.location.assign(result.redirect);
            });
          }}>
            {sent ? <><p id={destinationId} role="status">{t('weSentA6DigitCode')} <bdi className="font-bold">{email}</bdi></p><OtpInput value={token} onChange={setToken} disabled={pending} focusOnEntry describedBy={destinationId} /></>
              : <TextField label={t('email')} type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />}
            <Button type="submit" size="lg" className="w-full" disabled={pending || (sent && token.length !== 6)}>{pending ? t('oneMoment') : sent ? t('continue') : t('sendMeACode')}</Button>
          </form>
          {sent && <Button variant="secondary" disabled={pending} onClick={() => { setSent(false); setToken(''); }}>{t('changeEmailOrSendAgain')}</Button>}
        </>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </>}
    </GlassCard>
  </main>;
}
