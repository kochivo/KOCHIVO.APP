'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ForgotPasswordFlow } from './forgot-password-flow';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
import { TextField } from '@/ui/text-field';
import { preparePasswordRecovery, updatePassword } from '../data/update-password';
import type { ActionResult } from '../data/auth-client';
import { callAuthAction as runAuthAction } from '../data/client-action';

export function ResetPasswordForm({ code, token_hash, type }: { code?: string; token_hash?: string; type?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale, t);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [check, setCheck] = useState<ActionResult | null>(null);
  const [retry, setRetry] = useState(0);
  const request = useRef<{ retry: number; promise: Promise<ActionResult> } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let active = true;
    // React can rerun the effect, but a recovery link can only be exchanged once.
    if (request.current?.retry !== retry) {
      request.current = { retry, promise: runAuthAction(() => preparePasswordRecovery(
        token_hash !== undefined || type !== undefined ? { token_hash, type } : code,
      ), locale, t) };
    }
    void request.current.promise.then(result => { if (active) setCheck(result); });
    return () => { active = false; };
  }, [code, token_hash, type, retry, locale, t]);
  const [requestingLink, setRequestingLink] = useState(false);
  const ready = check?.recoveryReady === true;
  useEffect(() => { if (ready) form.current?.querySelector('input')?.focus(); }, [ready]);
  if (requestingLink) return <ForgotPasswordFlow focusEmail />;
  return <main className="mesh flex min-h-dvh items-center justify-center p-section pt-[max(1.5rem,var(--safe-top))]">
    <GlassCard level="strong" className="w-full max-w-md space-y-section p-section">
      <h1 className="text-3xl font-extrabold">{t('newPassword')}</h1>
      {!check && <p role="status" className="text-muted">{t('oneMoment')}</p>}
      {check && !ready && <>
        <p role="alert" className="text-danger">{check.error ?? t('invalidRecoveryLink')}</p>
        <Button size="lg" className="w-full" onClick={() => {
          if (check.recoveryInvalid) setRequestingLink(true);
          else { setCheck(null); setRetry(value => value + 1); }
        }}>{t(check.recoveryInvalid ? 'requestNewLink' : 'tryAgain')}</Button>
      </>}
      {ready && <>
        <p className="text-muted">{t('atLeast8CharactersWithA')}</p>
        <form ref={form} className="space-y-card-gap" aria-busy={pending} onSubmit={(event) => {
          event.preventDefault();
          const input = Object.fromEntries(new FormData(event.currentTarget));
          start(async () => {
            const result = await callAuthAction(() => updatePassword(input));
            if (result.recoveryInvalid) setCheck(result);
            setError(result.error ?? '');
            if (result.redirect) { router.replace('/login?passwordUpdated=1'); router.refresh(); }
          });
        }}>
          <TextField label={t('newPasswordLabel')} name="password" type="password" autoComplete="new-password" minLength={8} required disabled={pending} />
          <TextField label={t('enterItAgain')} name="confirm" type="password" autoComplete="new-password" required disabled={pending} />
          {error && <p role="alert" className="text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? t('saving') : t('savePassword')}</Button>
        </form>
      </>}
    </GlassCard>
  </main>;
}
