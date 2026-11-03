'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProgram, saveProgram } from '../data/program-io';
import type { ProgramDraft } from '../types';

export function useProgramDraft(id?: string) {
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    if (!id) return;
    let current = true;
    loadProgram(id).then(result => {
      if (!current) return;
      if (result.error) setError(result.error);
      else if (result.data) { setDraft(result.data); setDirty(false); setError(''); }
      setLoading(false);
    }).catch(() => { if (current) { setError('البرنامج متحمّلش. جرّب تاني'); setLoading(false); } });
    return () => { current = false; };
  }, [id, revision]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);
  const update = useCallback((operation: (current: ProgramDraft) => ProgramDraft) => {
    if (busy.current) return;
    setDraft(current => current ? operation(current) : current);
    setDirty(true);
  }, []);
  async function save() {
    if (!draft || busy.current) return false;
    busy.current = true;
    setSaving(true);
    setDirty(false);
    setError('');
    try {
      const result = await saveProgram(draft);
      if (result.error) { setError(result.error); setDirty(true); return false; }
      return true;
    } catch {
      setError('الحفظ متعملش. جرّب تاني'); setDirty(true); return false;
    } finally { busy.current = false; setSaving(false); }
  }
  function retry() { setLoading(true); setError(''); setRevision(value => value + 1); }
  function activated() { setDraft(current => current ? { ...current, status: 'active' } : current); }
  return { draft, dirty, loading, saving, error, update, save, retry, activated };
}
