'use client';
import { useEffect } from 'react';
import { AUTOSAVE_DELAY_MS } from '@/lib/autosave-delay';

export function useEditorAutosave({ dirty, busy, error, persist }: {
  dirty: boolean; busy: boolean; error: string; persist: () => Promise<void> | void;
}) {
  useEffect(() => {
    if (!dirty || busy || error) return;
    const timer = setTimeout(() => { void persist(); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, busy, error, persist]);
}
