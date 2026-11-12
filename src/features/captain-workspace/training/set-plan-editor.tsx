'use client';
import { useT } from '@/core/i18n/client';
import { Stepper } from '@/ui/stepper';
import type { SetTarget } from '@/features/programs';
import { messages } from './editor/messages';

export function SetPlanEditor({ plan, onChange }: { plan: SetTarget[]; onChange: (plan: SetTarget[] | null) => void }) {
  const t = useT(messages);
  const update = (index: number, patch: Partial<SetTarget>) => onChange(plan.map((row, i) => i === index ? { ...row, ...patch } : row));
  return <div className="space-y-3">
    {plan.map((row, index) => <div key={index} className="border-b border-line-soft pb-2">
      <Stepper size="compact" label={t('setNumber', { n: index + 1 })} value={row.reps_min} min={1} max={100} step={1}
        format={minimum => row.reps_max === null ? t('failure') : row.reps_max === minimum ? String(minimum) : `${minimum}–${row.reps_max}`}
        onChange={value => { const reps_min = Math.round(value); update(index, { reps_min, reps_max: row.reps_max === null ? null : Math.max(reps_min, row.reps_max) }); }} />
      <input type="number" aria-label={t('setMaximum', { n: index + 1 })} dir="ltr" min={row.reps_min}
        value={row.reps_max ?? ''} className="min-h-12 w-full bg-transparent text-center text-sm"
        onChange={event => update(index, { reps_max: event.target.value === '' ? null : Math.max(row.reps_min, Math.min(2147483647, Math.round(Number(event.target.value)))) })} />
      <select aria-label={t('setIntensity', { n: index + 1 })} value={row.rir ?? ''} className="min-h-12 w-full bg-surface text-center text-xs"
        onChange={event => update(index, { rir: event.target.value === '' ? null : Number(event.target.value) })}>
        <option value="">{t('noRir')}</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{t('rir', { n })}</option>)}
      </select>
    </div>)}
    <button className="min-h-12 rounded-full border border-line-soft px-3 text-xs" onClick={() => onChange(null)}>{t('uniform')}</button>
  </div>;
}
