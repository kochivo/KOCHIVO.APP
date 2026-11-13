'use client';
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
    <button id="week-menu" aria-label={t('options')} aria-haspopup="dialog" aria-expanded={open} className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-line px-3" onClick={() => setOpen(true)}><Ellipsis aria-hidden className="size-5" /><span className="hidden sm:inline">{t('options')}</span></button>
    {open && <ResponsiveDialog modal openerId="week-menu" fallbackId="week-menu" aria-label={t('options')} onDismiss={close} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md space-y-3 overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
      <h2 className="font-display text-[19px]">{t('options')}</h2>
      <label className="block text-xs text-faint">{tt('programName')}<input value={draft.title} maxLength={80} className="block min-h-12 w-full bg-transparent text-sm text-ink" onChange={event => update(current => ({ ...current, title: event.target.value }))} /></label>
      {weekly(draft) ? <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={draft.repeatWeekly !== false} className="size-6 accent-lime" onChange={event => update(current => ({ ...current, repeatWeekly: event.target.checked }))} />{t('repeat')}</label> : <>
        <p className="text-xs text-faint">{t('rotation')}</p><button disabled={draft.days.length > 7} className="min-h-12 w-full rounded-control border border-line px-3 text-start disabled:opacity-40" onClick={() => update(current => convertWeek(current, uuidv7))}>{t('convert')}</button>
        {draft.days.length > 7 && <p className="text-xs text-faint">{t('convertLimit')}</p>}
      </>}
      {day && <>
        <button className="min-h-12 w-full rounded-control border border-line px-3 text-start" onClick={() => {
          if (!day.is_rest_day && (day.exercises.length || day.cardio?.length)) setConfirm(true);
          else update(current => restDay(current, day.id, !day.is_rest_day));
        }}>{t(day.is_rest_day ? 'restore' : 'rest')}</button>
        {confirm && <div role="alert" className="rounded-control border border-line p-3"><p>{t('restConfirm')}</p><button className="min-h-12 rounded-full border border-line px-3 text-danger" onClick={() => { update(current => restDay(current, day.id, true)); setConfirm(false); }}>{t('confirm')}</button><button className="min-h-12 rounded-full border border-line px-3" onClick={() => setConfirm(false)}>{tt('cancel')}</button></div>}
        {!weekly(draft) && <div className="grid gap-2">
          <button className="min-h-12 rounded-control border border-line px-3 text-start" onClick={() => move(-1)} disabled={day.id === draft.days[0]?.id}>{t('up')}</button>
          <button className="min-h-12 rounded-control border border-line px-3 text-start" onClick={() => move(1)} disabled={day.id === draft.days.at(-1)?.id}>{t('down')}</button>
          <button className="min-h-12 rounded-control border border-line px-3 text-start text-danger" onClick={() => setDeleteConfirm(true)}>{t('deleteDay')}</button>
          {deleteConfirm && <div role="alert"><p>{pt('deletePrompt', { name: day.title })}</p><button className="min-h-12 rounded-full border border-line px-3 text-danger" onClick={() => { update(current => ({ ...current, days: current.days.filter(item => item.id !== day.id).map((item, index) => ({ ...item, position: index + 1 })) })); setDeleteConfirm(false); }}>{pt('confirmDelete')}</button><button className="min-h-12 rounded-full border border-line px-3" onClick={() => setDeleteConfirm(false)}>{tt('cancel')}</button></div>}
        </div>}
      </>}
      {draft.player_id && saved && <SaveTemplateButton kind="program" id={draft.id} title={draft.title} />}
      {onNew && <button className="min-h-12 w-full rounded-control border border-line px-3 text-start" onClick={() => { close(); onNew(); }}>{tt('newProgram')}</button>}
      <button className="min-h-12 rounded-full border border-line px-3" onClick={close}>{t('close')}</button>
    </ResponsiveDialog>}
  </>;
}
