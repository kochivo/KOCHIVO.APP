'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

export function useLiveQuery<T>(query: () => T | Promise<T>, onError?: (error: unknown) => void, retryKey = 0): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (error: unknown) => onError?.(error),
    });
    return () => subscription.unsubscribe();
  }, [query, onError, retryKey]);
  return value;
}
