'use client';
import { useEffect, useRef, useState } from 'react';
import type { FormDraft } from '../types';
import { createAutosave } from './autosave';
import type { SaveStatus } from './autosave';

export function useAutosave(form: FormDraft | null, save: (form: FormDraft) => Promise<void>, initialSaved = false) {
  const initial = useRef(initialSaved ? form : null);
  const [status, setStatus] = useState<SaveStatus>(form && !initialSaved ? 'pending' : 'saved');
  const controller = useRef<ReturnType<typeof createAutosave> | null>(null);
  useEffect(() => {
    const next = createAutosave(save, setStatus);
    controller.current = next;
    return () => { next.dispose(); controller.current = null; };
  }, [save]);
  useEffect(() => {
    if (form && form !== initial.current) controller.current?.update(form); else controller.current?.reset();
  }, [form, save]);
  useEffect(() => {
    if (!form || status === 'saved') return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form, status]);
  return { status, retry: () => controller.current?.retry() };
}
