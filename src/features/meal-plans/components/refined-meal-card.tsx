import Link from 'next/link';
import type { Translator } from '@/core/i18n/messages';
import { clickableClass } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import { formatNumber } from '@/lib/format';
import type { messages } from './v11/messages';

export function RefinedMealCard({ id, title, kcal, protein, carbs, fat, meals, players, split, t }: {
  id: string; title: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null;
  meals: number; players: number; split: boolean; t: Translator<typeof messages>;
}) {
  const macros = [
    { key: 'protein', grams: protein, factor: 4, bar: '' },
    { key: 'carbs', grams: carbs, factor: 4, bar: '[&>div]:bg-info [&>div]:bg-none' },
    { key: 'fat', grams: fat, factor: 9, bar: '[&>div]:bg-warn [&>div]:bg-none' },
  ] as const;
  const total = macros.reduce((sum, macro) => sum + (macro.grams ?? 0) * macro.factor, 0);
  return <Link href={`/captain/nutrition/${id}`} className={`${clickableClass} glass flex min-h-12 min-w-0 flex-col gap-stack rounded-card p-card`}>
    <div className="flex flex-wrap items-baseline justify-between gap-inline">
      <h2 className="min-w-0 break-words text-title font-bold">{title}</h2>
      {kcal !== null && <span className="flex items-baseline gap-inline"><bdi className="font-display text-stat font-extrabold tabular-nums">{formatNumber(kcal)}</bdi><small className="text-muted">{t('kcal')}</small></span>}
    </div>
    <div className="flex flex-wrap gap-stack">
      {macros.map(({ key, grams, factor, bar }) => grams !== null && <div key={key} className="min-w-20 flex-1 space-y-inline">
        <div className="flex flex-wrap justify-between gap-inline text-micro"><span className="text-muted">{t(key)}</span><b className="tabular-nums">{t('grams', { n: grams })}</b></div>
        <ProgressBar thin value={grams * factor} max={total} aria-label={t(key)} className={bar} />
      </div>)}
    </div>
    <div className="mt-auto flex flex-wrap justify-between gap-inline border-t border-line-soft pt-stack text-xs text-muted">
      <span>{t('mealCount', { n: meals })}{split && <> · {t('split')}</>}</span>
      <span>{t('usage', { n: players })}</span>
    </div>
  </Link>;
}
