'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { resourceStore } from './store';
import type { ResourceOptions } from './store';

export function useResource<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>,
  { pollMs, staleMs = 15_000 }: ResourceOptions = {}) {
  const state = useSyncExternalStore(
    useCallback(listener => key === null ? () => {} : resourceStore.subscribe(key, load, { pollMs, staleMs }, listener),
      [key, load, pollMs, staleMs]),
    () => resourceStore.read<T>(key), () => resourceStore.read<T>(null));
  return { ...state,
    retry: () => key === null ? Promise.resolve() : resourceStore.retry(key, load, { force: true }),
    mutate: (next: (current: T | undefined) => T, commit: () => Promise<unknown>) =>
      key === null ? Promise.resolve(false) : resourceStore.mutate(key, next, commit),
  };
}
