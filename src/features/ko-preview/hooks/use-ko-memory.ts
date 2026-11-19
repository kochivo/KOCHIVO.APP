import { useEffect, useState } from 'react';
import { koLearning, readKoMemory } from '../data/learning';
import type { MemoryState } from '../data/learning';

export function useKoMemory() {
  const [state, setState] = useState<MemoryState>();
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void readKoMemory(controller.signal)
      .then(result => { if (!controller.signal.aborted) setState(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [retry]);

  function reload() {
    setError(false);
    setState(undefined);
    setRetry(value => value + 1);
  }

  async function mutate(next: MemoryState, operation: object) {
    if (!state || busy) return;
    setState(next);
    setBusy(true);
    setError(false);
    try {
      await koLearning(operation);
    } catch {
      setState(state);
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return { state, error, busy, reload, mutate };
}
