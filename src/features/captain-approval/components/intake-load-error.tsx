'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../intake/messages';

export function IntakeLoadError({ error }: { error: string }) {
  const t = useT(messages);
  const router = useRouter();
  const [pending, start] = useTransition();
  return <main className="p-6"><div role="alert" aria-busy={pending} className="glass-strong rounded-card p-6">
    <p>{error}</p>
    <Button variant="secondary" disabled={pending} onClick={() => start(() => router.refresh())}>{t('retry')}</Button>
  </div></main>;
}
