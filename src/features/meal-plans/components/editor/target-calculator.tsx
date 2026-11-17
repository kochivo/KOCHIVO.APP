'use client';
import { NumberInput } from '@/ui/number-input';

import { editableFieldClass } from '@/ui/edit-in-place';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { PlayerFacts } from '@/features/player-file';
import type { Macros } from '@/lib/macros';
import { Button } from '@/ui/button';
import { CalculatorInputs } from '../calculator-inputs';
import { CalculatorResults } from '../calculator-results';
import { initialCalculatorValues, initialCalculatorGoal, calculatorResult } from '../calculator-view';
import { messages } from '../calculator/messages';

export function TargetCalculator({ facts, onApply }: { facts: PlayerFacts; onApply: (targets: Macros) => void }) {
  const t = useT(messages);
  const file = { facts, history: [] };
  const [values, setValues] = useState(() => initialCalculatorValues(file));
  const [goal, setGoal] = useState(() => initialCalculatorGoal(file));
  const [rate, setRate] = useState(goal === 'bulk' ? .25 : .5);
  const [split, setSplit] = useState(true);
  const result = calculatorResult(values, goal, rate);
  return <section className="glass mb-card-gap grid gap-card-gap rounded-card border border-line-soft p-card min-[1001px]:grid-cols-2">
    <div className="grid content-start gap-card-gap"><CalculatorInputs facts={facts} values={values} onChange={setValues} />
      <fieldset><legend>{t('goal')}</legend><div className="mt-inline flex flex-wrap gap-inline">{(['cut', 'maintain', 'bulk'] as const).map(value =>
        <Button key={value} variant="secondary" aria-pressed={value === goal} onClick={() => { setGoal(value); setRate(value === 'bulk' ? .25 : .5); }}>{t(value)}</Button>)}</div></fieldset>
      {goal !== 'maintain' && <label className="grid gap-inline">{t('rate')}<NumberInput min={0} max={2} step={.05} value={Number.isNaN(rate) ? '' : rate}
        onCommit={value => setRate(value)} className={`${editableFieldClass} min-h-12 rounded-control bg-surface px-stack`} /></label>}
    </div>
    <div className="grid content-start gap-card-gap">{result && values.weightKg !== undefined && values.trainingDays !== undefined
      ? <CalculatorResults result={result.energy} weightKg={values.weightKg} trainingDays={values.trainingDays} split={split} onSplit={setSplit} />
      : <p role="status">{t('invalid')}</p>}
      <Button variant="secondary" disabled={!result} onClick={() => { if (result) onApply(result.targets); }}>{t('apply')}</Button>
    </div>
  </section>;
}
