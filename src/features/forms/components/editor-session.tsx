'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import type { ScheduleContext } from '../schedule-context';
import { saveForm } from '../data/save-form';
import { useAutosave } from '../hooks/use-autosave';
import { FormBuilder } from './form-builder';
import { saveDraft } from '../hooks/save-draft';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { V11FormBuilder } from './v11-form-builder';

export function EditorSession({ initial, locale, onBusy, players = 0, scheduleContext }: {
  initial: FormDraft; locale: Locale; onBusy: (busy: boolean) => void; players?: number; scheduleContext?: ScheduleContext;
}) {
  const router = useRouter();
  const style = useArabicStyle();
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
  const autosave = useAutosave(form, save, !initial.creation_key);
  useEffect(() => { onBusy(autosave.status !== 'saved'); }, [autosave.status, onBusy]);
  const Builder = captainWorkspaceEnabled() ? V11FormBuilder : FormBuilder;
  return <Builder form={form} locale={locale} status={autosave.status} preview={preview}
    onChange={setForm} onPreview={() => setPreview(!preview)} onRetry={autosave.retry}
    onDiscard={() => setForm(saved)} players={players} style={style} scheduleContext={scheduleContext} />;
}
