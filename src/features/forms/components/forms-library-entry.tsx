'use client';
import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { messages } from '../messages';
import { LibraryWorkspace } from './library-workspace';

const EditorSession = lazy(() => import('./editor-session').then(module => ({ default: module.EditorSession })));

export function FormsLibraryEntry({ form, locale, children }: { form: FormDraft | null; locale: Locale; children?: ReactNode }) {
  const [busy, setBusy] = useState(Boolean(form));
  return <LibraryWorkspace busy={busy} editor={form ? <Suspense fallback={<p role="status">{messages[locale].loading}</p>}>
    <EditorSession key={form.id} initial={form} locale={locale} onBusy={setBusy} />
  </Suspense> : null}>{children}</LibraryWorkspace>;
}
