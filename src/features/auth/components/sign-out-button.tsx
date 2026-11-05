'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useState, useTransition } from 'react';
import { Button } from '@/ui';
import { signOut } from '../data/sign-out';
import { callAuthAction as runAuthAction } from '../data/client-action';

export function SignOutButton({ variant, className }: { variant?: 'primary' | 'danger'; className?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const callAuthAction = (action: Parameters<typeof runAuthAction>[0]) => runAuthAction(action, locale);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return <div><Button variant={variant} className={className} disabled={pending} onClick={() => start(async () => {
    const result = await callAuthAction(signOut); setError(result.error ?? '');
    if (result.redirect) window.location.assign(result.redirect);
  })}>{pending ? t('signingOut') : t('signOut')}</Button>{error && <p role="alert">{error}</p>}</div>;
}
