'use client';
import { clickableClass, Button } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Dumbbell } from 'lucide-react';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import type { CSSProperties, ButtonHTMLAttributes } from 'react';
import { useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import { ExerciseImage } from '@/ui/exercise-image';
import type { DraftExercise, LibraryExercise } from '@/features/programs';
import { exerciseLabel } from '../exercise-label';
import { messages as workspaceMessages } from '../messages';
import { messages as trainingMessages } from './messages';
import { messages } from './editor/messages';
import { ExerciseFields } from './exercise-fields';
import { planLabel, uniformPlan } from '@/features/programs';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import dynamic from 'next/dynamic';
import { InjuryNote } from './injury-note';
import type { TaggedExercise } from './fit-checks';
import { messages as setMessages } from '@/lib/training/messages';

const AlternativesSheet = dynamic(() => import('./alternatives-sheet').then(module => module.AlternativesSheet));
const SetsSheet = dynamic(() => import('./sets-sheet').then(module => module.SetsSheet));

export type Patch = Partial<Pick<DraftExercise, 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'rir' | 'notes' |
  'alternatives' | 'set_plan' | 'alternative_library'>>;
export function TrainingExerciseRow({ row, onPatch, onRemove, onMove, onLink, first, last, groupStart, groupEnd, groupLabel, groupRest, onLinkAbove, onThird, tag, dragProps, style, injuries = [], candidates = [], onReplace }: {
  row: DraftExercise; onPatch: (patch: Patch) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
  onLink: () => void; first: boolean; last: boolean; groupStart?: boolean; tag?: string | null; dragProps: ButtonHTMLAttributes<HTMLButtonElement>; style?: CSSProperties;
  injuries?: readonly string[]; candidates?: readonly TaggedExercise[]; onReplace?: (library: LibraryExercise) => void;
  groupEnd?: boolean; groupLabel?: string | null; groupRest?: number; onLinkAbove?: () => void; onThird?: () => void;
}) {
  const t = useT(messages), wt = useT(workspaceMessages), tt = useT(trainingMessages), [open, setOpen] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false), st = useT(setMessages);
  const enabled = captainWorkspaceEnabled();
  const name = row.library?.name_ar || row.library?.name_en || wt('exerciseUnavailable');
  const reps = row.set_plan ? planLabel(row.set_plan) : row.reps_max === null ? t('failure') : row.reps_min === row.reps_max ? String(row.reps_min) : `${row.reps_min}–${row.reps_max}`;
  const rest = `${Math.floor(row.rest_seconds / 60)}:${String(row.rest_seconds % 60).padStart(2, '0')}`;
  return <li style={style} className={tag ? `mx-card-gap border-x border-lime/50 bg-lime-soft ${groupStart ? 'mt-card-gap rounded-t-card border-t' : ''} ${groupEnd ? 'mb-card-gap rounded-b-card border-b' : ''}` : 'border-t border-line-soft'}>
    {onLinkAbove && <Button type="button" variant="secondary" block className="border-dashed" onClick={onLinkAbove}>{st('link')}</Button>}
    {groupStart && <header className="flex flex-wrap justify-between gap-inline p-stack text-xs"><b className="text-lime">{st('superset', { letter: groupLabel ?? '' })}</b>
      <span className="text-muted">{st('rest', { seconds: groupRest ?? row.rest_seconds })}</span></header>}
    {tag && !groupStart && <p className="px-page-x py-inline text-center text-xs text-lime">{st('noRest')}</p>}
    {(tag || row.set_plan?.some(set => set.drop)) && <div className="flex gap-inline px-page-x pt-inline">
      {tag && <span className="rounded-control bg-lime-soft px-inline py-inline text-xs text-lime" dir="ltr">{tag}</span>}
      {row.set_plan?.some(set => set.drop) && <span className="rounded-full bg-warn-soft px-stack py-inline text-xs text-warn">{st('drop')}</span>}
    </div>}
    <div className={`flex items-center gap-inline px-page-x ${open ? 'bg-surface/30' : ''}`}>
      <button aria-expanded={open} aria-controls={`exercise-${row.id}`} onClick={() => setOpen(value => !value)} className={`${clickableClass} grid min-h-14 min-w-0 flex-1 grid-cols-[repeat(3,minmax(0,1fr))_auto] items-center gap-inline py-stack text-start @min-[460px]:grid-cols-[auto_minmax(0,1fr)_repeat(3,minmax(0,3.5rem))_auto]`}>
        {row.library?.media_path ? <ExerciseImage src={exerciseMediaUrl(row.library.media_path)} alt="" width={44} height={44} className="size-11 rounded-xl border border-line object-cover" /> :
          <span className="glass-strong grid size-11 place-items-center rounded-xl border border-line"><Dumbbell aria-hidden className="size-4 text-faint" /></span>}
        <span className="col-span-3 min-w-0 @min-[460px]:col-span-1"><bdi className="block break-words text-sm font-semibold">{name}</bdi>{row.library?.name_en && row.library.name_en !== name && <bdi className="block text-micro text-faint">{row.library.name_en}</bdi>}<small className="block text-micro text-faint">{exerciseLabel(row.library?.body_part, wt)} · {exerciseLabel(row.library?.equipment, wt)}</small></span>
        {([['sets', row.sets], ['compactReps', reps], ['restLabel', rest]] as const).map(([key, value]) => <span key={key} className="min-w-0 text-center"><small className="block text-micro text-muted">{t(key)}</small><bdi dir="ltr" className="block break-words rounded-control bg-bg-deep py-inline font-display text-row font-extrabold tabular-nums">{value}</bdi></span>)}
        <DisclosureChevron expanded={open} className="size-4" />
      </button>
      <Button {...dragProps} aria-label={tt('reorder', { name })} type="submit" variant="ghost" block={false} className="hidden min-h-12 min-w-12 touch-none items-center justify-center px-0 text-muted min-[760px]:flex"
        onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1); } }}><GripVertical aria-hidden className="size-4" /></Button>
    </div>
    {onReplace && <InjuryNote exerciseId={row.exercise_id} injuries={injuries} candidates={candidates} onReplace={onReplace} />}
    {open && <div id={`exercise-${row.id}`} className="space-y-stack px-page-x pb-card pt-inline">
      <ExerciseFields row={row} onPatch={onPatch} />
      <textarea aria-label={t('note')} placeholder={t('note')} value={row.notes ?? ''} maxLength={200} rows={2} className={`${editableFieldClass} min-h-12 w-full rounded-control border border-line bg-surface px-card py-stack text-sm text-ink`} onChange={event => onPatch({ notes: event.target.value || null })} />
      <div className="flex flex-wrap items-center gap-inline">
        <Button id={`sets-${row.id}`} type="button" variant="secondary" block={false} onClick={() => setSetsOpen(true)}>{st('sets')}</Button>
        {enabled && <Button id={`alternatives-${row.id}`} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-xs"}
          onClick={() => setAlternativesOpen(true)}>{t('alternatives')}{Boolean(row.alternatives?.length) &&
            <span className="ms-inline rounded-full bg-lime-soft px-inline py-inline text-lime">{row.alternatives?.length}</span>}</Button>}
        <Button disabled={last && row.superset_group === null} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack text-xs disabled:opacity-40"} onClick={onLink}>{t(row.superset_group === null ? 'link' : 'unlink')}</Button>
        {enabled && <button aria-pressed={Boolean(row.set_plan)} className={`${clickableClass} min-h-12 rounded-full border border-line-soft px-stack text-xs`}
          onClick={() => onPatch({ set_plan: row.set_plan ? null : uniformPlan(row) })}>{t('differentSets')}</button>}
        <Button disabled={first} aria-label={tt('moveUp', { name })} type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center disabled:opacity-40"} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-4" /></Button>
        <Button disabled={last} aria-label={tt('moveDown', { name })} type="submit" variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center disabled:opacity-40"} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-4" /></Button>
        <Button aria-label={tt('remove', { name })} type="submit" variant={'secondary'} block={false} className={"ms-auto min-h-12 px-stack text-xs text-danger"} onClick={onRemove}>{t('remove')}</Button>
      </div>
    </div>}
    {enabled && alternativesOpen && <AlternativesSheet row={row} onPatch={onPatch} onClose={() => setAlternativesOpen(false)} />}
    {setsOpen && <SetsSheet row={row} onChange={set_plan => onPatch({ set_plan })} onClose={() => setSetsOpen(false)} />}
    {onThird && <Button type="button" variant="secondary" block className="border-dashed" onClick={onThird}>{st('third')}</Button>}
  </li>;
}
