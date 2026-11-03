'use client';
import { useEffect, useState, useTransition } from 'react';
import { Button, ErrorState, GlassCard, LoadingState, TextField } from '@/ui';
import { invitePreview } from '../data/invite-preview';
import { redeemInvite } from '../data/redeem-invite';
import { sendEmailCode } from '../data/send-email-code';
import { verifyEmailCode } from '../data/verify-email-code';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';
import { callAuthAction } from '../data/client-action';
import { authError } from '../errors';

export function PlayerInviteFlow({ code, callbackError = false }: { code: string; callbackError?: boolean }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof invitePreview>> | null>(null);
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(callbackError ? 'الدخول مكملش، جرّب تاني' : '');
  const [pending, start] = useTransition();
  useEffect(() => {
    let active = true;
    invitePreview(code).then((result) => { if (active) setPreview(result); })
      .catch((error: unknown) => { if (active) setPreview({ error: authError(error) }); });
    return () => { active = false; };
  }, [code, retry]);
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-6">
      {!preview ? <LoadingState /> : preview.error ? <ErrorState message={preview.error} retryLabel="جرّب تاني" onRetry={() => { setPreview(null); setRetry((value) => value + 1); }} /> : <>
        <GlassCard className="p-4"><p>كابتن {preview.captainName} عايزك تبدأ معاه</p></GlassCard>
        <h1 className="text-3xl font-extrabold">{sent ? 'اكتب الكود' : 'يلا نبدأ'}</h1>
        {preview.signedIn ? <Button disabled={pending} size="lg" className="w-full" onClick={() => start(async () => {
          const result = await callAuthAction(() => redeemInvite(code)); setError(result.error ?? '');
          if (result.redirect) window.location.assign(result.redirect);
        })}>{pending ? 'جاري ربط الحساب' : 'كمّل مع الكابتن'}</Button> : <>
          {!sent && <><p className="text-muted">من غير كلمة سر. اختار طريقة الدخول</p><GoogleButton intent="player" code={code} /><p className="text-center text-muted">أو بالإيميل</p></>}
          <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await callAuthAction(() => sent ? verifyEmailCode({ email, token }, code) : sendEmailCode({ email }));
              setError(result.error ?? '');
              if (!result.error) setSent(true);
              if (result.redirect) window.location.assign(result.redirect);
            });
          }}>
            {sent ? <><p role="status">بعتنا ٦ أرقام على <b dir="ltr">{email}</b></p><OtpInput value={token} onChange={setToken} disabled={pending} /></>
              : <TextField label="الإيميل" type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />}
            <Button type="submit" size="lg" className="w-full" disabled={pending || (sent && token.length !== 6)}>{pending ? 'استنى لحظة' : sent ? 'كمّل' : 'ابعتلي كود'}</Button>
          </form>
          {sent && <Button variant="ghost" disabled={pending} onClick={() => { setSent(false); setToken(''); }}>غيّر الإيميل أو ابعت تاني</Button>}
        </>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </>}
    </GlassCard>
  </main>;
}
