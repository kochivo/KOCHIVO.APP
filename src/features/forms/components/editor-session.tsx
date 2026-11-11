'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { saveForm } from '../data/save-form';
import { useAutosave } from '../hooks/use-autosave';
import { FormBuilder } from './form-builder';
import { saveDraft } from '../hooks/save-draft';

export function EditorSession({ initial, locale, onBusy }: {
  initial: FormDraft; locale: Locale; onBusy: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const save = useCallback((form: FormDraft) => saveDraft(form, saveForm, () => active.current, next => {
    setSaved(next);
    window.history.replaceState(null, '', `/${locale}/captain/library/forms?edit=${next.id}`);
    router.refresh();
  }), [locale, router]);
  const autosave = useAutosave(form, save);
  useEffect(() => { onBusy(autosave.status !== 'saved'); }, [autosave.status, onBusy]);
  return <FormBuilder form={form} locale={locale} status={autosave.status} preview={preview}
    onChange={setForm} onPreview={() => setPreview(!preview)} onRetry={autosave.retry}
    onDiscard={() => setForm(saved)} />;
}
