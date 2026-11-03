'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button, GlassCard, Segmented, TextField } from '@/ui';
import { signInPassword } from '../data/sign-in-password';
import { signUpCaptain } from '../data/sign-up-captain';
import { GoogleButton } from './google-button';
import { callAuthAction } from '../data/client-action';

export function CaptainAuthCard({ callbackError = false }: { callbackError?: boolean }) {
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(callbackError ? 'الدخول مكملش، جرّب تاني' : '');
  const [pending, start] = useTransition();
  return <main className="mesh flex min-h-dvh items-center justify-center p-6">
    <GlassCard level="strong" className="w-full max-w-md space-y-6 p-8">
      <h1 className="text-3xl font-extrabold">{mode === 'login' ? 'أهلاً يا كابتن' : 'اعمل حسابك كابتن'}</h1>
      <p className="text-muted">{mode === 'login' ? 'ادخل تكمّل مع لاعبينك' : 'دقيقتين وتبعت أول دعوة للاعب'}</p>
      <Segmented aria-label="الدخول أو حساب جديد" value={mode} onChange={(value) => { setMode(value); setError(''); setMessage(''); }}
        options={[{ value: 'login', label: 'دخول' }, { value: 'signup', label: 'حساب جديد' }]} />
      <GoogleButton intent="captain" />
      <p className="text-center text-muted">أو بالإيميل</p>
      <form className="space-y-4" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(event.currentTarget));
        start(async () => {
          const result = await callAuthAction(() => mode === 'login' ? signInPassword(input) : signUpCaptain(input));
          setError(result.error ?? ''); setMessage(result.message ?? '');
          if (result.redirect) window.location.assign(result.redirect);
        });
      }}>
        <fieldset disabled={pending} className="space-y-4">
          {mode === 'signup' && <TextField name="full_name" label="اسمك" autoComplete="name" maxLength={80} required />}
          <TextField name="email" type="email" label="الإيميل" autoComplete="email" dir="ltr" required />
          <TextField name="password" type="password" label="كلمة السر" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {error && <p role="alert" className="text-danger">{error}</p>}
          {message && <p role="status">{message}</p>}
          <Button type="submit" size="lg" className="w-full">{pending ? 'استنى لحظة' : mode === 'login' ? 'دخول' : 'اعمل الحساب'}</Button>
        </fieldset>
      </form>
      <Link href="/forgot-password" className="flex min-h-12 items-center text-lime">نسيت كلمة السر؟</Link>
      <p className="text-sm text-muted">لاعب؟ افتح لينك الدعوة اللي بعتهولك الكابتن</p>
    </GlassCard>
  </main>;
}
