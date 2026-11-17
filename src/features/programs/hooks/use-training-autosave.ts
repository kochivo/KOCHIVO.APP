'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { createSaveQueue } from '../autosave';
import { saveProgram } from '../data/program-io';
import type { ProgramDraft } from '../types';
import { AUTOSAVE_DELAY_MS } from '@/lib/autosave-delay';

export function useTrainingAutosave(initial: ProgramDraft | null) {
  const t = useT(messages);
  const [draft, setDraft] = useState(initial);
  const latest = useRef(initial);
  const saved = useRef(initial);
  const queue = useRef(createSaveQueue(saveProgram));
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const replace = useCallback((value: ProgramDraft) => {
    latest.current = value; saved.current = value; setDraft(value); setStatus('saved'); setError('');
  }, []);
  const update = useCallback((operation: (current: ProgramDraft) => ProgramDraft) => {
    if (!latest.current) return;
    const next = operation(latest.current);
    latest.current = next; setDraft(next); setStatus('saving'); setError('');
  }, []);
  const flush = useCallback(async () => {
    const snapshot = latest.current;
    if (!snapshot) return false;
    if (snapshot === saved.current) return true;
    setStatus('saving'); setError('');
    try {
      const result = await queue.current.save(snapshot);
      if (!result.ok) { setStatus('error'); setError(result.error); return false; }
      saved.current = snapshot;
      if (latest.current !== snapshot) return false;
      setStatus('saved'); return true;
    } catch { setStatus('error'); setError(t('couldntSaveTryAgain')); return false; }
  }, [t]);
  useEffect(() => {
    if (!draft || draft === saved.current) return;
    const timer = setTimeout(() => { void flush(); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, flush]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current === saved.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      if (latest.current !== saved.current) void flush();
    };
  }, [flush]);
  return { draft, update, replace, flush, status, error };
}
