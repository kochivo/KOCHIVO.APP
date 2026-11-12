'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { createReplacementPlan } from '../../data/player-editor';
import { messages } from '../../messages';

export function NewPlanButton({ playerId, disabled }: { playerId: string; disabled: boolean }) {
  const t = useT(messages);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await createReplacementPlan(playerId);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/captain/nutrition/${result.data}`);
    } catch { setError(t('couldntCreateThePlanTryAgain')); }
    finally { setBusy(false); }
  }
  return <div><Button variant="secondary" disabled={disabled || busy} onClick={() => void create()}>{t(busy ? 'creatingPlan' : 'newPlan')}</Button>
    {error && <p role="alert" className="text-danger">{error}</p>}</div>;
}
