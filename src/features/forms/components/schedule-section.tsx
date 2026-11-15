import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { rowLinkClass } from '@/ui/row-link';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { lazy, Suspense, useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { messages } from '../messages';
import { messages as assessmentMessages } from '../assessments/messages';

const ScheduleEditor = lazy(() => import('./schedule-editor').then(module => ({ default: module.ScheduleEditor })));

export function ScheduleSection({ form, locale, onChange }: {
  form: FormDraft; locale: Locale; onChange: (form: FormDraft) => void;
}) {
  const [open, setOpen] = useState(false), m = messages[locale];
  const workspace = captainWorkspaceEnabled();
  return <details className="mt-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary aria-expanded={workspace ? open : undefined} className={workspace ? `${rowLinkClass} flex list-none items-center justify-between gap-2 py-3` : 'min-h-12 cursor-pointer py-3'}>{m.schedule} · {assessmentMessages[locale].all}{workspace && <DisclosureChevron expanded={open} />}</summary>
    {open && <Suspense fallback={<p role="status">{m.loading}</p>}>
      <ScheduleEditor form={form} locale={locale} onChange={onChange} />
    </Suspense>}
  </details>;
}
