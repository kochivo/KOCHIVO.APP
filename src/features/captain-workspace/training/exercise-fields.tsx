'use client';
import { NumberInput } from '@/ui/number-input';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useT } from '@/core/i18n/client';
import { Stepper } from '@/ui/stepper';
import type { DraftExercise } from '@/features/programs';
import type { Patch } from './exercise-row';
import { messages } from './editor/messages';
import { messages as trainingMessages } from './messages';
import { planLabel } from '@/lib/set-plan';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function ExerciseFields({ row, onPatch }: { row: DraftExercise; onPatch: (patch: Patch) => void }) {
  const t = useT(messages), tt = useT(trainingMessages), name = row.library?.name_ar || row.library?.name_en || '';
  const box = 'glass-strong min-w-0 rounded-card border border-line p-stack text-center [&_output]:text-xl';
  return <div className="grid grid-cols-2 gap-stack min-[761px]:grid-cols-4">
    <div className={box}><Stepper size="compact" label={t('setsLabel')} value={row.sets} min={1} max={20} step={1} onChange={sets => onPatch({ sets })} /></div>
    <div className={box}>
      {captainWorkspaceEnabled() && row.set_plan ? <p className="text-sm tabular-nums">{planLabel(row.set_plan)}</p> : <>
      <div dir="ltr"><Stepper size="compact" label={t('repsLabel')} controlLabel={tt('repsMin', { name })} value={row.reps_min} min={1} max={100} step={1}
        format={minimum => row.reps_max === null ? t('failure') : row.reps_max === minimum ? String(minimum) : `${minimum}–${row.reps_max}`}
        onChange={reps_min => onPatch({ reps_min, reps_max: row.reps_max === null ? null : Math.max(reps_min, row.reps_max) })} /></div>
      {row.reps_max !== null && <NumberInput dir="ltr" aria-label={tt('repsMax', { name })} className={`${editableFieldClass} min-h-12 w-full bg-surface text-center text-sm`} min={row.reps_min} max={100} value={row.reps_max} onCommit={value => onPatch({ reps_max: Math.max(row.reps_min, Math.min(100, value || row.reps_min)) })} />}
      <label className="flex min-h-12 items-center justify-center gap-inline text-micro text-faint"><input type="checkbox" checked={row.reps_max === null} className={`${editableFieldClass} accent-lime`} onChange={event => onPatch({ reps_max: event.target.checked ? null : row.reps_min })} />{t('failureToggle')}</label>
      </>}
    </div>
    <div className={box}><Stepper size="compact" label={t('restLabel')} value={row.rest_seconds} min={0} max={900} step={15}
      format={seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`} onChange={rest_seconds => onPatch({ rest_seconds })} /></div>
    <label className="flex min-w-0 flex-col gap-stack rounded-card border border-dashed border-line p-stack text-center text-xs text-faint">{t('intensity')}
      <select aria-label={t('intensity')} value={row.rir ?? ''} className={`${editableFieldClass} min-h-12 w-full bg-surface text-center text-sm`} onChange={event => onPatch({ rir: event.target.value === '' ? null : Number(event.target.value) })}>
        <option value="">{t('noRir')}</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{t('rir', { n })}</option>)}
      </select>
    </label>
  </div>;
}
