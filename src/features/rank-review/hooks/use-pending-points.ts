'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { reviewPoints } from '@/features/ranks';
import { loadPending } from '../data/load-pending';
import type { PendingWorkout } from '../types';

export async function decidePending(id: string, approve: boolean, actions: {
  remove: () => void; restore: () => void; saved: () => void;
  review: (id: string, approve: boolean) => Promise<void>;
}): Promise<void> {
  actions.remove();
  try { await actions.review(id, approve); }
  catch { actions.restore(); return; }
  actions.saved();
}

export function usePendingPoints(onReviewed?: () => void, enabled = true) {
  const [rows, setRows] = useState<PendingWorkout[]>();
  const [error, setError] = useState(false);
  const [decisionError, setDecisionError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const reload = useCallback(() => {
    setRows(undefined); setError(false); setRevision(value => value + 1);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void loadPending().then(value => { if (!cancelled) setRows(value); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [enabled, revision]);
  async function decide(id: string, approve: boolean) {
    if (lock.current || !rows?.some(row => row.id === id)) return;
    lock.current = true; setBusy(true); setDecisionError(false);
    const before = rows;
    await decidePending(id, approve, {
      review: reviewPoints,
      remove: () => setRows(before.filter(row => row.id !== id)),
      restore: () => { setRows(before); setDecisionError(true); },
      saved: () => onReviewed?.(),
    });
    lock.current = false; setBusy(false);
  }
  return { rows, error, decisionError, busy, reload, decide };
}
