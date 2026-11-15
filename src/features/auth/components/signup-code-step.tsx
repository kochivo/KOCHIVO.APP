'use client';
import { useState, useTransition } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import { callAuthAction } from '../data/client-action';
import type { ActionResult } from '../data/auth-client';
import { resendCaptainCode, verifyCaptainCode } from '../data/sign-up-captain';
import { OtpInput } from './otp-input';
import { ResendCodeButton } from './resend-code-button';

const navigate = (redirect: string) => window.location.assign(redirect);

export function SignupCodeStep({ email, verify = verifyCaptainCode, onDone = navigate }: {
  email: string;
  verify?: (input: { email: string; token: string }) => Promise<ActionResult>;
  onDone?: (redirect: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [token, setToken] = useState('');
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  return <div className="space-y-card-gap">
    <p role="status" className="break-words text-muted">{t('codeSentTo', { email })}</p>
    <form className="space-y-card-gap" aria-busy={pending} onSubmit={event => {
      event.preventDefault();
      start(async () => {
        const result = await callAuthAction(() => verify({ email, token }), locale, t);
        setError(result.error ?? '');
        if (result.redirect) onDone(result.redirect);
      });
    }}>
      <OtpInput value={token} onChange={setToken} disabled={pending} />
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || token.length !== 6}>{pending ? t('oneMoment') : t('continue')}</Button>
    </form>
    <ResendCodeButton sentAt={sentAt} pending={pending} onResend={() => start(async () => {
      const result = await callAuthAction(() => resendCaptainCode({ email }), locale, t);
      setError(result.error ?? '');
      if (!result.error) { setSentAt(Date.now()); setToken(''); }
    })} />
  </div>;
}
