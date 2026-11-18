import Link from 'next/link';
import type { Translator } from '@/core/i18n/messages';
import { Button, clickableClass } from '@/ui/button';
import { formatNumber } from '@/lib/format';
import { Users } from 'lucide-react';
import type { messages } from './v11/messages';
import { macroSplit } from './v11/meal-library-model';
import type { MealLibraryPlan } from './v11/meal-library-model';

export function RefinedMealCard({ plan, onAssign, t }: {
  plan: MealLibraryPlan;
  onAssign: () => void;
  t: Translator<typeof messages>;
}) {
  const { id, title, kcal, protein, carbs, fat, meals, players, tag } = plan;
  const shares = macroSplit(plan);
  const macros = [
    { key: 'protein', grams: protein, color: 'bg-lime' },
    { key: 'carbs', grams: carbs, color: 'bg-info max-md:bg-warn' },
    { key: 'fat', grams: fat, color: 'bg-warn max-md:bg-info' },
  ] as const;
  const tone = tag === 'draft' ? 'tone-neutral' : tag === 'allDays' ? 'tone-lime' : 'tone-info';

  return <article className="glass relative flex min-w-0 flex-col gap-stack rounded-card p-card">
    <header className="flex items-start justify-between gap-inline max-md:items-center">
      <div className="min-w-0">
        <h2 className="break-words text-md font-bold max-md:text-sm">
          <Link href={`/captain/nutrition/${id}`} className={`${clickableClass} after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-lime`}>{title}</Link>
        </h2>
        <span className={`${tone} rounded-md px-inline text-micro font-semibold max-md:bg-transparent max-md:px-0 max-md:font-normal max-md:text-muted`}>{t(tag)}</span>
      </div>
      <span className="tone-neutral shrink-0 rounded-md px-inline text-micro font-semibold md:hidden">{t('playerCount', { n: players.length })}</span>
      {kcal !== null && <div className="glass-strong shrink-0 rounded-control text-end max-md:hidden">
        <bdi className="block font-display text-stat font-extrabold tabular-nums tracking-tight">{formatNumber(kcal)}</bdi>
        <span className="block text-micro text-muted">{t('kcalPerDay')}</span>
      </div>}
    </header>
    <div className="grid gap-inline">
      <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-line-soft">
        {macros.map(({ key, color }, index) => Boolean(shares[index]) &&
          <span key={key} style={{ width: `${shares[index]}%` }} className={`${color} border-e-2 border-bg last:border-e-0`} />)}
      </div>
      <div className="flex flex-wrap gap-inline text-micro text-muted max-md:justify-between">
        {macros.map(({ key, grams, color }) => grams !== null && <span key={key} className="inline-flex items-center gap-inline">
          <span aria-hidden className={`size-2 rounded-sm max-md:hidden ${color}`} />
          <span>{t(key)} <bdi className="tabular-nums">{t('grams', { n: grams })}</bdi></span>
        </span>)}
        {kcal !== null && <span className="md:hidden"><bdi className="font-display font-bold tabular-nums">{formatNumber(kcal)}</bdi> {t('kcalPerDay')}</span>}
      </div>
    </div>
    <footer className={`mt-auto flex min-h-12 flex-wrap items-center justify-between gap-inline border-t border-line-soft pt-stack text-xs text-muted ${players.length ? 'max-md:hidden' : ''}`}>
      <span>{t('mealCount', { n: meals })}</span>
      {players.length > 0 ? <span className="flex items-center gap-inline">
        <span className="flex [&>*+*]:-ms-inline">
          {players.slice(0, 3).map(player => <span key={player.id} title={player.name ?? undefined}
            className="grid size-7 place-items-center rounded-full border border-bg bg-surface-raised font-bold text-ink">
            {player.name?.trim()[0]?.toLocaleUpperCase() || <Users size={12} aria-hidden />}
          </span>)}
        </span>
        {t('playerCount', { n: players.length })}
      </span> : <span className="flex flex-wrap items-center gap-inline">
        {t('unassigned')}
        <Button className="relative px-inline text-row" variant="secondary" block={false} onClick={onAssign}>{t('assignShort')}</Button>
      </span>}
    </footer>
  </article>;
}
