import { lazy, Suspense, useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { messages } from '../messages';

const ScheduleEditor = lazy(() => import('./schedule-editor').then(module => ({ default: module.ScheduleEditor })));

export function ScheduleSection({ form, locale, onChange }: {
  form: FormDraft; locale: Locale; onChange: (form: FormDraft) => void;
}) {
  const [open, setOpen] = useState(false), m = messages[locale];
  return <details className="mt-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-12 cursor-pointer py-3">{m.schedule}</summary>
    {open && <Suspense fallback={<p role="status">{m.loading}</p>}>
      <ScheduleEditor form={form} locale={locale} onChange={onChange} />
    </Suspense>}
  </details>;
}
