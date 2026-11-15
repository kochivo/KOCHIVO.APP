'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { messages } from './subscription-messages';
import { startSubscription } from './start-subscription';

export function SubscriptionWaitEntry({ linkId, training, nutrition }: {
  linkId: string; training: boolean; nutrition: boolean;
}) {
  const t = useT(messages), router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return <section role="status" className="glass rounded-card border border-calm/20 p-card text-sm">
    <p>{t('explanation')}</p>
    {(!training || !nutrition) && <ul className="mt-inline space-y-inline text-muted">
      {!training && <li>{t('trainingMissing')}</li>}
      {!nutrition && <li>{t('nutritionMissing')}</li>}
    </ul>}
    <Button variant="secondary" disabled={pending} className="mt-stack" onClick={() => {
      setError('');
      start(async () => {
        try {
          const result = await startSubscription(linkId);
          if (result.error) { setError(result.error); return; }
          toast.success({ title: t('started'), detail: t('detail'), icon: 'payment' });
          router.refresh();
        } catch { setError(t('error')); }
      });
    }}>{t(pending ? 'starting' : 'start')}</Button>
    {error && <p role="alert" className="mt-inline text-danger">{error}</p>}
  </section>;
}
