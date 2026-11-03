'use client';
import { Button } from '@/ui';
import type { Macros } from '@/lib/macros';
import { macroTargetsFromKcal, targetDelta } from '../totals';

const labels = { kcal: 'السعرات', protein: 'بروتين', carbs: 'كارب', fat: 'دهون' };
export function TargetsBar({ targets, totals, onChange }: { targets: Macros; totals: Macros; onChange: (targets: Macros) => void }) {
  const delta = targetDelta(totals, targets);
  return <section aria-label="الأهداف والإجمالي" className="glass-strong grid gap-4 rounded-card p-5">
    <h2 className="text-xl font-bold">الأهداف والإجمالي</h2>
    {(Object.keys(labels) as (keyof Macros)[]).map(key => <div key={key} className="grid gap-2">
      <label className="flex items-center justify-between gap-3">{labels[key]}
        <input type="number" min={key === 'kcal' ? 800 : 0} max={key === 'kcal' ? 8000 : 32767} step={1}
          value={targets[key]} onChange={event => onChange({ ...targets, [key]: Number(event.target.value) })}
          className="min-h-12 w-28 rounded-control border border-line bg-surface px-3" />
      </label>
      <output aria-live="polite" className="text-2xl font-bold">{totals[key]} / {targets[key]} {key === 'kcal' ? 'سعرة' : 'ج'}</output>
      <span className={Math.abs(delta[key]) <= targets[key] * .05 ? 'text-lime' : 'text-warn'}>
        الفرق: {delta[key] > 0 ? '+' : ''}{Math.round(delta[key] * 10) / 10}
      </span>
    </div>)}
    <Button variant="secondary" className="min-h-12" onClick={() => onChange(macroTargetsFromKcal(targets.kcal))}>احسب من السعرات</Button>
  </section>;
}
