'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useState } from 'react';
import { loadPlan, savePlan } from '../data/plan-io';
import { activatePlan } from '../data/activate';
import type { PlanDraft } from '../types';
import { useToast } from '@/ui/toast';

export function usePlanDraft(planId: string, { clearErrorsOnEdit = false, initialDraft, save = savePlan }: {
  clearErrorsOnEdit?: boolean; initialDraft?: PlanDraft; save?: typeof savePlan;
} = {}) {
  const t = useT(messages);
  const toast = useToast();
  const [draft, setDraft] = useState<PlanDraft | null>(initialDraft ?? null);
  const [saved, setSaved] = useState(initialDraft ? JSON.stringify(initialDraft) : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialDraft);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [lastActivate, setLastActivate] = useState(false);
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    if (initialDraft) return;
    let current = true;
    loadPlan(planId).then(value => {
      if (current) {
        if (value.ok) { setDraft(value.data); setSaved(JSON.stringify(value.data)); setError(''); }
        else setError(value.error);
        setLoading(false);
      }
    }).catch(() => { if (current) { setError(t('couldntLoadThePlanTryAgain')); setLoading(false); } });
    return () => { current = false; };
  }, [planId, retry, t, initialDraft]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(change: (draft: PlanDraft) => PlanDraft) {
    if (clearErrorsOnEdit) setError('');
    setDraft(previous => previous ? change(previous) : previous);
  }
  async function persist(activate = false) {
    if (!draft || busy) return;
    setLastActivate(activate);
    if (activate && !draft.meals.some(meal => meal.items.length > 0)) {
      setError(t('addAMealAndFoodFirst')); return;
    }
    setBusy(true); setError('');
    try {
      const result = await save(draft);
      if (!result.ok) { setError(result.error); return; }
      setSaved(JSON.stringify(draft));
      if (activate) {
        const activation = await activatePlan(draft.id);
        if (!activation.ok) { setError(activation.error); return; }
        const active = { ...draft, status: 'active' as const };
        setDraft(active); setSaved(JSON.stringify(active));
      }
      if (activate) toast.success(t('planActivatedForPlayer'));
    } catch { setError(t('couldntSaveTryAgain')); }
    finally { setBusy(false); }
  }
  return { draft, dirty, error, loading, busy, update, persist, retrySave: () => persist(lastActivate),
    reload: () => { setLoading(true); setRetry(value => value + 1); } };
}
