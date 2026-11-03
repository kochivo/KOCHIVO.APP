'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/ui';
import { signOut } from '../data/sign-out';
import { callAuthAction } from '../data/client-action';

export function SignOutButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return <div><Button disabled={pending} onClick={() => start(async () => {
    const result = await callAuthAction(signOut); setError(result.error ?? '');
    if (result.redirect) window.location.assign(result.redirect);
  })}>{pending ? 'جاري الخروج' : 'تسجيل الخروج'}</Button>{error && <p role="alert">{error}</p>}</div>;
}
