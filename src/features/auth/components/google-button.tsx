'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/ui';
import { signInGoogle } from '../data/sign-in-google';
import { callAuthAction } from '../data/client-action';

export function GoogleButton({ intent, code }: { intent: 'captain' | 'player'; code?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return <div className="space-y-2">
    <Button variant="secondary" size="lg" className="w-full" disabled={pending} onClick={() => start(async () => {
      const result = await callAuthAction(() => signInGoogle(intent, code));
      setError(result.error ?? '');
      if (result.redirect) window.location.assign(result.redirect);
    })}>{pending ? 'جاري الدخول' : 'كمّل بجوجل'}</Button>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </div>;
}
