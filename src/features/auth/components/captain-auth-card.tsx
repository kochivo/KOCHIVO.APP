'use client';
import { LanguageSwitch } from '@/ui/language-switch';
import { localeDir } from '@/core/i18n/locale';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button, GlassCard, Segmented, TextField } from '@/ui';
import { signInPassword } from '../data/sign-in-password';
import { signUpCaptain } from '../data/sign-up-captain';
import { GoogleButton } from './google-button';
import { callAuthAction as runAuthAction } from '../data/client-action';
import type { AuthMode } from '../auth-mode';
import { SignupCodeStep } from './signup-code-step';

export function CaptainAuthCard({ callbackError = false, initialMode = 'login' }: { callbackError?: boolean; initialMode?: AuthMode }) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [mode, setMode] = useState<string>(initialMode);
  const [message, setMessage] = useState('');
  const [codeEmail, setCodeEmail] = useState('');
  const [error, setError] = useState(callbackError ? t('signInFailedTryAgain') : '');
  const [pending, start] = useTransition();
  return <main dir={localeDir(locale)} className="mesh flex min-h-dvh items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <LanguageSwitch />
      <h1 className="text-3xl font-extrabold">{mode === 'login' ? t('welcomeCoach') : t('createYourCoachAccount')}</h1>
      <p className="text-muted">{mode === 'login' ? t('pickUpWhereYourPlayersLeft') : t('inviteYourFirstPlayerInMinutes')}</p>
      {codeEmail ? <SignupCodeStep email={codeEmail} /> : <>
      <Segmented aria-label={t('signInOrCreateAnAccount')} value={mode} onChange={(value) => { setMode(value); setError(''); setMessage(''); }}
        options={[{ value: 'login', label: t('signIn') }, { value: 'signup', label: t('createAccount') }]} />
      <GoogleButton intent="captain" />
      <p className="text-center text-muted">{t('orUseEmail')}</p>
      <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => mode === 'login' ? signInPassword(input) : signUpCaptain(input));
          setError(result.error ?? ''); setMessage(result.message ?? '');
          if (result.codeEmail) setCodeEmail(result.codeEmail);
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <fieldset disabled={pending} className="space-y-4">
          {mode === 'signup' && <TextField name="full_name" label={t('yourName')} autoComplete="name" maxLength={80} required />}
          <TextField name="email" type="email" label={t('email')} autoComplete="email" dir="ltr" required />
          <TextField name="password" type="password" label={t('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {error && <p role="alert" className="text-danger">{error}</p>}
          {message && <p role="status">{message}</p>}
          <Button type="submit" size="lg" className="w-full">{pending ? t('oneMoment') : mode === 'login' ? t('signIn') : t('createAccountAction')}</Button>
        </fieldset>
      </form>
      <Link href="/forgot-password" className="flex min-h-12 items-center text-lime">{t('forgotPassword')}</Link>
      </>}
      <p className="text-sm text-muted">{t('playerOpenTheInviteYourCoach')}</p>
    </GlassCard>
  </main>;
}
