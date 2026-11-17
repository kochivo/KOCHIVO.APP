'use client';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { useArabicStyle } from '@/core/i18n/client';
import type { FormDraft } from '../types';
import type { ScheduleContext } from '../schedule-context';
import { formCopy } from '../form-copy';
import { LibraryWorkspace } from './library-workspace';

const EditorSession = lazy(() => import('./editor-session').then(module => ({ default: module.EditorSession })));

export function FormsLibraryEntry({ form, locale, children, players = 0, scheduleContext }: {
  form: FormDraft | null; locale: Locale; children?: ReactNode; players?: number; scheduleContext?: ScheduleContext;
}) {
  const [busy, setBusy] = useState(Boolean(form));
  const router = useRouter();
  const wasOpen = useRef(Boolean(form));
  useEffect(() => {
    if (wasOpen.current && !form) { setBusy(false); router.refresh(); }
    wasOpen.current = Boolean(form);
  }, [form, router]);
  const style = useArabicStyle();
  return <LibraryWorkspace busy={busy} editor={form ? <Suspense fallback={<p role="status">{formCopy(locale, style).loading}</p>}>
    <EditorSession key={form.id} initial={form} locale={locale} onBusy={setBusy} players={players} scheduleContext={scheduleContext} />
  </Suspense> : null}>{children}</LibraryWorkspace>;
}
