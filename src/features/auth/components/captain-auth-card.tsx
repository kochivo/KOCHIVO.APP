'use client';
import { LanguageSwitch } from '@/ui/language-switch';
import { localeDir } from '@/core/i18n/locale';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
import { Segmented } from '@/ui/segmented';
import { TextField } from '@/ui/text-field';
import { signUpCaptain } from '../data/sign-up-captain';
import { GoogleButton } from './google-button';
import { callAuthAction as runAuthAction } from '../data/client-action';
import type { AuthMode } from '../auth-mode';
import { SignupCodeStep } from './signup-code-step';
import { LoginMethods } from './login-methods';
import { AuthLogo } from './auth-logo';

export function CaptainAuthCard({ callbackError = false, initialMode = 'login', returnTo, passwordUpdated = false }: {
  callbackError?: boolean; passwordUpdated?: boolean; initialMode?: AuthMode; returnTo?: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [mode, setMode] = useState<string>(initialMode);
  const [message, setMessage] = useState('');
  const [codeEmail, setCodeEmail] = useState('');
  const [error, setError] = useState(callbackError ? t('signInFailedTryAgain') : '');
  const [pending, start] = useTransition();
  if (mode === 'login') return <main dir={localeDir(locale)} className="min-h-dvh bg-bg px-page-x pb-[max(1.5rem,var(--safe-bottom))] pt-[max(1.5rem,var(--safe-top))]">
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col gap-section">
      <div className="flex flex-wrap items-center justify-between gap-stack"><Link href={`/${locale}`} aria-label={t('authBrand')} className="press inline-flex min-h-12 items-center rounded-control focus-visible:outline-lime"><AuthLogo /></Link><LanguageSwitch compact /></div>
      <div className="space-y-inline pt-section"><h1 className="text-3xl font-extrabold">{t('loginTitle')}</h1><p className="text-sm text-muted">{t('loginEveryone')}</p></div>
      {callbackError && <p role="alert" className="text-danger">{t('signInFailedTryAgain')}</p>}
      {passwordUpdated && <p role="status" className="text-sm text-muted">{t('passwordUpdated')}</p>}
      <LoginMethods returnTo={returnTo} />
      <div className="flex items-center gap-stack text-sm text-faint"><span className="h-px flex-1 bg-line" />{t('loginOr')}<span className="h-px flex-1 bg-line" /></div>
      <GoogleButton intent="captain" returnTo={returnTo} />
      <div className="mt-auto space-y-inline pt-section text-center">
        <Link href="/welcome#code" className="inline-flex min-h-12 items-center text-sm text-lime">{t('newPlayerInvite')}</Link>
        {!returnTo && <div><Button variant="ghost" onClick={() => setMode('signup')}>{t('createAccount')}</Button></div>}
      </div>
    </div>
  </main>;
  return <main dir={localeDir(locale)} className="mesh flex min-h-dvh items-center justify-center p-section pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-section p-section">
      <LanguageSwitch />
      <h1 className="text-3xl font-extrabold">{mode === 'login' ? t('welcomeCoach') : t('createYourCoachAccount')}</h1>
      <p className="text-muted">{mode === 'login' ? t('pickUpWhereYourPlayersLeft') : t('inviteYourFirstPlayerInMinutes')}</p>
      {codeEmail ? <SignupCodeStep email={codeEmail} /> : <>
      <Segmented aria-label={t('signInOrCreateAnAccount')} value={mode} onChange={(value) => { setMode(value); setError(''); setMessage(''); }}
        options={[{ value: 'login', label: t('signIn') }, { value: 'signup', label: t('createAccount') }]} />
      <GoogleButton intent="captain" />
      <p className="text-center text-muted">{t('orUseEmail')}</p>
      <form className="space-y-card-gap" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => signUpCaptain(input));
          setError(result.error ?? ''); setMessage(result.message ?? '');
          if (result.codeEmail) setCodeEmail(result.codeEmail);
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <fieldset disabled={pending} className="space-y-card-gap">
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
