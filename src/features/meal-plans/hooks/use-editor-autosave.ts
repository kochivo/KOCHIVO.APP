'use client';
import { useEffect } from 'react';

export function useEditorAutosave({ dirty, busy, error, persist }: {
  dirty: boolean; busy: boolean; error: string; persist: () => Promise<void> | void;
}) {
  useEffect(() => {
    if (!dirty || busy || error) return;
    const timer = setTimeout(() => { void persist(); }, 800);
    return () => clearTimeout(timer);
  }, [dirty, busy, error, persist]);
}
