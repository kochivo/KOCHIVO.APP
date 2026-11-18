'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { Segmented } from '@/ui/segmented';
import { TextField } from '@/ui/text-field';
import { KoPlay } from '@/ui/icons/ko-play';
import { messages } from '../messages';
import { callAuthAction } from '../data/client-action';
import { signInPassword } from '../data/sign-in-password';
import { sendSignInEmailCode, verifySignInEmailCode } from '../data/sign-in-email-code';
import { OtpInput } from './otp-input';
import { isInstalledApp } from '@/lib/installed-app';
import { consentReturnPath } from '../consent-return';

function subscribeInstalled(onChange: () => void) {
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const installedSnapshot = () => isInstalledApp(window);
const serverSnapshot = () => false;

export function LoginMethods({ returnTo }: { returnTo?: string } = {}) {
  const t = useT(messages);
  const locale = useLocale();
  const installed = useSyncExternalStore(subscribeInstalled, installedSnapshot, serverSnapshot);
  const [choice, setChoice] = useState<string | null>(null);
  const method = choice ?? (installed ? 'email-code' : 'password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [codeEmail, setCodeEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  return <div className="space-y-card-gap">
    <Segmented aria-label={t('loginMethod')} value={method} options={[
      { value: 'email-code', label: t('emailCodeChoice') }, { value: 'password', label: t('password') },
    ]} onChange={value => { if (pending) return; setChoice(value); setCodeEmail(''); setToken(''); setMessage(''); setError(''); }} />
    <form className="space-y-card-gap" aria-busy={pending} onSubmit={event => {
      event.preventDefault();
      start(async () => {
        const result = await callAuthAction(() => method === 'password' ? signInPassword({ email, password })
          : codeEmail ? verifySignInEmailCode({ email: codeEmail, token }) : sendSignInEmailCode({ email }), locale, t);
        setError(result.error ?? ''); setMessage(result.message ?? '');
        if (result.codeEmail) setCodeEmail(result.codeEmail);
        if (result.redirect) window.location.assign(consentReturnPath(returnTo) ?? result.redirect);
      });
    }}>
      <fieldset disabled={pending} className="space-y-card-gap">
        {codeEmail ? <OtpInput value={token} onChange={setToken} disabled={pending} />
          : <TextField name="email" type="email" label={t('email')} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" dir="ltr" required />}
        {method === 'password' && <TextField name="password" type="password" label={t('password')} value={password}
          onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />}
        {error && <p role="alert" className="text-danger">{error}</p>}
        {message && <p role="status" className="text-sm text-muted">{message}</p>}
        <Button type="submit" size="lg" block disabled={pending || (!!codeEmail && token.length !== 6)}>
          <KoPlay aria-hidden="true" />{pending ? t('oneMoment') : method === 'password' ? t('signIn') : codeEmail ? t('continue') : t('sendMeACode')}
        </Button>
      </fieldset>
    </form>
    {codeEmail && <Button variant="ghost" disabled={pending} onClick={() => { setCodeEmail(''); setToken(''); setError(''); setMessage(''); }}>{t('changeEmailOrSendAgain')}</Button>}
    {method === 'password' && <Link href="/forgot-password" className="inline-flex min-h-12 items-center text-sm text-lime">{t('forgotPassword')}</Link>}
  </div>;
}
