'use client';
import { useState, useTransition } from 'react';
import { Button, GlassCard, TextField } from '@/ui';
import { updatePassword } from '../data/update-password';
import { callAuthAction } from '../data/client-action';

export function ResetPasswordForm({ code }: { code?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState(code);
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <h1 className="text-3xl font-extrabold">كلمة سر جديدة</h1>
      <p className="text-muted">٨ حروف على الأقل، وفيها حرف ورقم</p>
      <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => updatePassword(input, recoveryCode));
          if (result.recoveryReady) setRecoveryCode(undefined);
          setError(result.error ?? '');
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <TextField label="كلمة السر الجديدة" name="password" type="password" autoComplete="new-password" minLength={8} required disabled={pending} />
        <TextField label="اكتبها تاني" name="confirm" type="password" autoComplete="new-password" required disabled={pending} />
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? 'جاري الحفظ' : 'احفظ كلمة السر'}</Button>
      </form>
    </GlassCard>
  </main>;
}
