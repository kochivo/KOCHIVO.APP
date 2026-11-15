'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { SaveTemplateButton } from '@/features/templates';
import { programMessages } from '@/features/programs';
import { convertWeek, restDay, weekly } from './editor-draft';
import type { Update } from './editor-draft';
import { messages } from './editor/messages';
import { messages as trainingMessages } from './messages';
import { Button } from '@/ui/button';

export function WeekMenu({ draft, day, update, saved, onNew }: { draft: ProgramDraft; day?: DraftDay; update: Update; saved?: boolean; onNew?: () => void }) {
  const t = useT(messages), tt = useT(trainingMessages), pt = useT(programMessages), [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false), [deleteConfirm, setDeleteConfirm] = useState(false);
  const close = () => { setOpen(false); setConfirm(false); setDeleteConfirm(false); };
  const move = (delta: -1 | 1) => update(current => {
    const days = [...current.days], from = days.findIndex(item => item.id === day?.id), to = from + delta;
    if (from < 0 || to < 0 || to >= days.length) return current;
    const moved = days.splice(from, 1)[0]; if (moved) days.splice(to, 0, moved);
    return { ...current, days: days.map((item, index) => ({ ...item, position: index + 1 })) };
  });
  return <>
    <Button id="week-menu" aria-label={t('options')} aria-haspopup="dialog" aria-expanded={open} type="submit" variant={'secondary'} block={false} className={"inline-flex min-h-12 min-w-12 items-center justify-center gap-inline px-stack"} onClick={() => setOpen(true)}><Ellipsis aria-hidden className="size-5" /><span className="hidden sm:inline">{t('options')}</span></Button>
    {open && <ResponsiveDialog modal openerId="week-menu" fallbackId="week-menu" aria-label={t('options')} onDismiss={close} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md space-y-stack overflow-y-auto rounded-card p-card text-ink backdrop:bg-bg-deep/80">
      <h2 className="font-display text-title">{t('options')}</h2>
      <label className="block text-xs text-faint">{tt('programName')}<input value={draft.title} maxLength={80} className={`${editableFieldClass} block min-h-12 w-full bg-surface text-sm text-ink`} onChange={event => update(current => ({ ...current, title: event.target.value }))} /></label>
      {weekly(draft) ? <label className="flex min-h-12 items-center gap-stack"><input type="checkbox" checked={draft.repeatWeekly !== false} className={`${editableFieldClass} size-6 accent-lime`} onChange={event => update(current => ({ ...current, repeatWeekly: event.target.checked }))} />{t('repeat')}</label> : <>
        <p className="text-xs text-faint">{t('rotation')}</p><Button disabled={draft.days.length > 7} type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full px-stack text-start disabled:opacity-40"} onClick={() => update(current => convertWeek(current, uuidv7))}>{t('convert')}</Button>
        {draft.days.length > 7 && <p className="text-xs text-faint">{t('convertLimit')}</p>}
      </>}
      {day && <>
        <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full px-stack text-start"} onClick={() => {
          if (!day.is_rest_day && (day.exercises.length || day.cardio?.length)) setConfirm(true);
          else update(current => restDay(current, day.id, !day.is_rest_day));
        }}>{t(day.is_rest_day ? 'restore' : 'rest')}</Button>
        {confirm && <div role="alert" className="rounded-control border border-line p-stack"><p>{t('restConfirm')}</p><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-danger"} onClick={() => { update(current => restDay(current, day.id, true)); setConfirm(false); }}>{t('confirm')}</Button><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack"} onClick={() => setConfirm(false)}>{tt('cancel')}</Button></div>}
        {!weekly(draft) && <div className="grid gap-inline">
          <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-start"} onClick={() => move(-1)} disabled={day.id === draft.days[0]?.id}>{t('up')}</Button>
          <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-start"} onClick={() => move(1)} disabled={day.id === draft.days.at(-1)?.id}>{t('down')}</Button>
          <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-start text-danger"} onClick={() => setDeleteConfirm(true)}>{t('deleteDay')}</Button>
          {deleteConfirm && <div role="alert"><p>{pt('deletePrompt', { name: day.title })}</p><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-danger"} onClick={() => { update(current => ({ ...current, days: current.days.filter(item => item.id !== day.id).map((item, index) => ({ ...item, position: index + 1 })) })); setDeleteConfirm(false); }}>{pt('confirmDelete')}</Button><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack"} onClick={() => setDeleteConfirm(false)}>{tt('cancel')}</Button></div>}
        </div>}
      </>}
      {draft.player_id && saved && <SaveTemplateButton kind="program" id={draft.id} title={draft.title} />}
      {onNew && <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full px-stack text-start"} onClick={() => { close(); onNew(); }}>{tt('newProgram')}</Button>}
      <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack"} onClick={close}>{t('close')}</Button>
    </ResponsiveDialog>}
  </>;
}
