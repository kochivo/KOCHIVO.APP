'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { cycle, macros } from '../energy';
import { messages } from './calculator/messages';
import { Button } from '@/ui/button';

export function CalculatorResults({ result, weightKg, trainingDays, split, onSplit }: {
  result: { bmr: number; tdee: number; target: number }; weightKg: number; trainingDays: number;
  split: boolean; onSplit: (split: boolean) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const allocation = macros(result.target, weightKg);
  const { protein, fat } = allocation.grams;
  const proposed = cycle(result.target, trainingDays);
  const splitAvailable = Math.min(proposed.training, proposed.rest) >= protein * 4 + fat * 9;
  const cycling = split && splitAvailable;
  const splitCalories = cycling ? proposed : { training: result.target, rest: result.target };
  return <div className="grid gap-card-gap">
    <section className="glass-strong grid grid-cols-3 gap-stack rounded-card p-card" aria-label={t('target')}>
      {(['bmr', 'tdee', 'target'] as const).map(key => <div key={key} className={key === 'target' ? 'text-lime' : ''}>
        <h3 className="text-sm">{t(key)}</h3><output className="block text-2xl font-bold sm:text-3xl">{number(result[key])}</output>
      </div>)}
    </section>
    <section className="glass grid gap-card-gap rounded-card p-card" aria-label={t('macros')}>
      <h2 className="text-xl font-bold">{t('macros')}</h2>
      {(['protein', 'carbs', 'fat'] as const).map(key => <div key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-stack">
        <span>{t(key)}</span><div role="meter" aria-label={t(key)} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(allocation.percentages[key])} className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-lime" style={{ width: `${allocation.percentages[key]}%` }} />
        </div><div className="text-end"><strong>{t('grams', { value: number(allocation.grams[key]) })}</strong>
          <small className="block text-muted">{t('percent', { value: number(Math.round(allocation.percentages[key])) })}</small>
        </div>
      </div>)}
    </section>
    <section className="glass grid gap-card-gap rounded-card p-card">
      <button type="button" role="switch" aria-checked={cycling} disabled={!splitAvailable} onClick={() => onSplit(!cycling)}
        className="min-h-12 rounded-control border border-line px-page-x text-start font-semibold">{t('split')}</button>
      <p className="text-sm text-muted">{t('splitHint')}</p>
      {!splitAvailable && <p role="status" className="text-warn">{t('splitUnavailable')}</p>}
      <div className="grid grid-cols-2 gap-stack">{(['training', 'rest'] as const).map(key => <div key={key} className="glass-strong rounded-control p-card">
        <h3>{t(key)}</h3><output className="block text-2xl font-bold">{t('kcal', { value: number(splitCalories[key]) })}</output>
        <p className="text-sm text-muted">{t('protein')} {t('grams', { value: number(protein) })}</p>
        <p className="text-sm text-muted">{t('fat')} {t('grams', { value: number(fat) })}</p>
        <p className="text-sm text-muted">{t('carbs')} {t('grams', { value: number(Math.round((splitCalories[key] - protein * 4 - fat * 9) / 4)) })}</p>
      </div>)}</div>
      <Button type="button" onClick={() => onSplit(false)} variant={'secondary'} block={false} className={"min-h-12 px-page-x"}>{t('oneNumber')}</Button>
    </section>
  </div>;
}
