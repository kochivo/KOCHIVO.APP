'use client';
import { useCallback, useRef, useState } from 'react';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { loadTiersWorkspace } from '../data/tiers-workspace';
import { messages } from './messages';
import type { Catalog } from './types';
import type { ActionResult } from '../types';

export function useCatalog() {
  const t = useT(messages), lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const load = useCallback(async () => {
    const result = await loadTiersWorkspace();
    if (result.error !== undefined) throw new Error(result.error);
    return result.data;
  }, []);
  const resource = useResource('billing:tiers-workspace', load);
  async function change<T>(optimistic: (current: Catalog) => Catalog, commit: () => Promise<ActionResult<T>>) {
    if (lock.current || !resource.data) return false;
    lock.current = true; setBusy(true); setError('');
    let failure = t('failure');
    const ok = await resource.mutate(current => optimistic(current ?? resource.data as Catalog), async () => {
      const result = await commit();
      if (result.error !== undefined) { failure = result.error; throw new Error(result.error); }
    });
    if (ok) await resource.retry();
    else setError(failure);
    lock.current = false; setBusy(false);
    return ok;
  }
  return { ...resource, busy, error, change, retry: async () => { setError(''); await resource.retry(); } };
}
