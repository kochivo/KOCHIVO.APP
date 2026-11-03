'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useState } from 'react';
import { loadPlan, savePlan } from '../data/plan-io';
import { activatePlan } from '../data/activate';
import type { PlanDraft } from '../types';

export function usePlanDraft(planId: string) {
  const t = useT(messages);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [lastActivate, setLastActivate] = useState(false);
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    let current = true;
    loadPlan(planId).then(value => {
      if (current) { setDraft(value); setSaved(JSON.stringify(value)); setError(''); setLoading(false); }
    }).catch(() => { if (current) { setError(t('couldntLoadThePlanTryAgain')); setLoading(false); } });
    return () => { current = false; };
  }, [planId, retry, t]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(change: (draft: PlanDraft) => PlanDraft) {
    setDraft(previous => previous ? change(previous) : previous);
    setMessage('');
  }
  async function persist(activate = false) {
    if (!draft || busy) return;
    setLastActivate(activate);
    setBusy(true); setError(''); setMessage('');
    try {
      await savePlan(draft);
      setSaved(JSON.stringify(draft));
      if (activate) {
        await activatePlan(draft.id);
        const active = { ...draft, status: 'active' as const };
        setDraft(active); setSaved(JSON.stringify(active));
      }
      setMessage(activate ? t('planActivatedForPlayer') : t('planSaved'));
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('couldntSaveTryAgain')); }
    finally { setBusy(false); }
  }
  return { draft, dirty, error, loading, busy, message, update, persist, retrySave: () => persist(lastActivate),
    reload: () => { setLoading(true); setRetry(value => value + 1); } };
}
