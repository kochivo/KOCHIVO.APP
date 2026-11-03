'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useState, useTransition } from 'react';
import { ForgotPasswordFlow } from './forgot-password-flow';
import { Button, GlassCard, TextField } from '@/ui';
import { updatePassword } from '../data/update-password';
import { callAuthAction as runAuthAction } from '../data/client-action';

export function ResetPasswordForm({ code, token_hash, type }: { code?: string; token_hash?: string; type?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState<string | { token_hash?: string; type?: string } | undefined>(
    token_hash !== undefined || type !== undefined ? { token_hash, type } : code,
  );
  const [invalidLink, setInvalidLink] = useState(false);
  const [requestingLink, setRequestingLink] = useState(false);
  if (requestingLink) return <ForgotPasswordFlow />;
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <h1 className="text-3xl font-extrabold">{t('newPassword')}</h1>
      <p className="text-muted">{t('atLeast8CharactersWithA')}</p>
      <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => updatePassword(input, recovery));
          if (result.recoveryReady) setRecovery(undefined);
          setInvalidLink(result.recoveryInvalid ?? false);
          setError(result.error ?? '');
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <TextField label={t('newPasswordLabel')} name="password" type="password" autoComplete="new-password" minLength={8} required disabled={pending} />
        <TextField label={t('enterItAgain')} name="confirm" type="password" autoComplete="new-password" required disabled={pending} />
        {error && <p role="alert" className="text-danger">{error}</p>}
        {invalidLink
          ? <Button size="lg" className="w-full" onClick={() => setRequestingLink(true)}>{t('requestNewLink')}</Button>
          : <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? t('saving') : t('savePassword')}</Button>}
      </form>
    </GlassCard>
  </main>;
}
