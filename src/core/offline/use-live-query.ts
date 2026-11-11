'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

export function useLiveQuery<T>(query: () => T | Promise<T>, onError?: (error: unknown) => void, retryKey = 0): T | undefined {
  const [state, setState] = useState<{ query: typeof query; value?: T }>({ query });
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: value => setState({ query, value }),
      error: (error: unknown) => onError?.(error),
    });
    return () => subscription.unsubscribe();
  }, [query, onError, retryKey]);
  return state.query === query ? state.value : undefined;
}
