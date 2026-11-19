import { useEffect, useState } from 'react';
import type { KoContext } from '../context';

export function useKoContextName(account: boolean, context: KoContext | null) {
  const [name, setName] = useState('');
  const serializedContext = JSON.stringify(context);
  useEffect(() => {
    if (!account || context?.screen !== 'player') return;
    const controller = new AbortController();
    const body = new FormData();
    body.set('context', serializedContext);
    body.set('contextOnly', '1');
    void fetch('/api/ko', { method: 'POST', body, signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ name: string | null }> : null)
      .then(result => { if (!controller.signal.aborted) setName(result?.name ?? ''); })
      .catch(() => { if (!controller.signal.aborted) setName(''); });
    return () => controller.abort();
  }, [account, serializedContext, context?.screen]);
  return name;
}
