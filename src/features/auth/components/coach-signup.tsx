'use client';
import { useState, useTransition } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, GlassCard, TextField } from '@/ui';
import { LanguageSwitch } from '@/ui/language-switch';
import { messages } from '../messages';
import { signUpPlayer, verifyPlayerCode } from '../data/sign-up-player';
import { callAuthAction } from '../data/client-action';
import { GoogleButton } from './google-button';
import { SignupCodeStep } from './signup-code-step';
import { browserSelection } from '../package-selection';

export function CoachSignup({ coach, callbackError = false }: { coach: string; callbackError?: boolean }) {
  const t = useT(messages), locale = useLocale();
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState(callbackError ? t('coachRequestFailed') : '');
  const [message, setMessage] = useState('');
  const [codeEmail, setCodeEmail] = useState('');
  const [pending, start] = useTransition();
  return <main className="mesh flex min-h-dvh items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <LanguageSwitch /><h1 className="text-3xl font-bold">{t('playerSignup')}</h1>
      <p className="text-muted">{t('coachRequestHint')}</p>
      {codeEmail ? <SignupCodeStep email={codeEmail} verify={input => verifyPlayerCode(input, coach, browserSelection())} /> : <>
      <GoogleButton intent="player" coach={coach} />
      <form className="space-y-4" aria-busy={pending} onSubmit={event => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => signUpPlayer(input, coach, existing, browserSelection()), locale, t);
          setError(result.error ?? ''); setMessage(result.message ?? '');
          if (result.codeEmail) setCodeEmail(result.codeEmail);
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <fieldset disabled={pending} className="space-y-4">
          {!existing && <TextField label={t('yourName')} name="full_name" autoComplete="name" maxLength={80} required />}
          <TextField label={t('email')} name="email" type="email" autoComplete="email" dir="ltr" required />
          <TextField label={t('password')} name="password" type="password" autoComplete={existing ? 'current-password' : 'new-password'} required />
          {error && <p role="alert" className="text-danger">{error}</p>}
          {message && <p role="status">{message}</p>}
          <Button type="submit" className="w-full">{pending ? t('oneMoment') : t('sendCoachRequest')}</Button>
        </fieldset>
      </form>
      <Button variant="secondary" disabled={pending} onClick={() => setExisting(value => !value)}>{existing ? t('createAccount') : t('signIn')}</Button>
      </>}
    </GlassCard>
  </main>;
}
