'use client';
import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import { createT } from '@/core/i18n/messages';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../redesign/messages';
import { AssessmentScheduleEntry } from './assessment-schedule-entry';
import { ScheduleEditor } from './schedule-editor';
import { Button } from '@/ui/button';

export function LibrarySchedulesEntry(props: ComponentProps<typeof ScheduleEditor>) {
  const [open, setOpen] = useState(false), id = useId();
  const t = createT(messages, props.locale, props.style);
  return <div id={id} tabIndex={-1}>
    <ScheduleEditor {...props} onManage={() => setOpen(true)} />
    {open && <ResponsiveDialog modal fallbackId={id} onDismiss={() => setOpen(false)} aria-label={t('schedule')}
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-auto rounded-card border border-line p-card text-ink">
      <header className="mb-card-gap flex flex-wrap items-center justify-between gap-stack">
        <h2 className="font-display text-lg">{t('schedule')}</h2>
        <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => setOpen(false)}>{t('close')}</Button>
      </header>
      <AssessmentScheduleEntry formId={props.form.id} locale={props.locale} />
    </ResponsiveDialog>}
  </div>;
}
