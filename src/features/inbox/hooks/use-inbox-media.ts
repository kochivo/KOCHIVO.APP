'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaUrls } from '../data/inbox';
import type { InboxItem } from '../types';

export function useInboxMedia(item: InboxItem) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refreshed = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await mediaUrls({ kind: item.kind, id: item.id });
      if (current !== generation.current) return;
      setError(Boolean(result.error));
      if (result.data) setUrls(result.data);
    } catch { if (current === generation.current) setError(true); }
    finally { if (current === generation.current) setLoading(false); }
  }, [item.id, item.kind]);
  useEffect(() => {
    const token = generation;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; token.current++; };
  }, [load]);
  const retry = () => {
    setLoading(true);
    setError(false);
    return load();
  };
  const failed = () => {
    if (!refreshed.current) {
      refreshed.current = true;
      void retry();
    } else setError(true);
  };
  return { urls, loading, error, failed, retry };
}
