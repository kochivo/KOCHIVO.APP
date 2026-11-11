'use client';
import { useCallback, useRef, useState } from 'react';
import { useResource } from '@/core/resource';
import { useLocale } from '@/core/i18n/client';
import { loadQueue, mergeQueuePage, moreQueue } from './data/load';
export function useQueue() {
  const locale = useLocale();
  const loader = useCallback(() => loadQueue(), []);
  const resource = useResource(`captain-queue:${locale}`, loader);
  const [moreError, setMoreError] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function more() {
    if (!resource.data || busy.current) return;
    busy.current = true; setPending(true); setMoreError(false);
    try {
      const result = await moreQueue(resource.data);
      await resource.mutate(current => mergeQueuePage(current, result), async () => {});
    } catch { setMoreError(true); }
    finally { busy.current = false; setPending(false); }
  }
  return { ...resource, more, pending, moreError };
}
