import { Suspense } from 'react';
import Link from 'next/link';
import { createT } from '@/core/i18n';
import type { Locale } from '@/core/i18n';
import { PlayerPlans } from './player-plans';
import { CalculatorContent } from './calculator-content';
import { messages } from './calculator/messages';

export function NutritionWorkspaceEntry({ playerId, locale, view }: { playerId: string; locale: Locale; view: string }) {
  const t = createT(messages, locale);
  const calc = view === 'calc';
  const href = `/captain/players/${playerId}/nutrition`;
  return <div className="mx-auto grid max-w-6xl gap-5">
    <nav aria-label={t('choosePlan')} className="glass flex gap-2 rounded-control p-2">
      <Link href={href} aria-current={!calc ? 'page' : undefined} className={`flex min-h-12 items-center rounded-control px-5 ${!calc ? 'text-lime' : 'text-muted'}`}>{t('plan')}</Link>
      <Link href={`${href}?view=calc`} aria-current={calc ? 'page' : undefined} className={`flex min-h-12 items-center rounded-control px-5 ${calc ? 'text-lime' : 'text-muted'}`}>{t('calculator')}</Link>
    </nav>
    {calc ? <Suspense fallback={<p role="status">{t('loading')}</p>}>
      <CalculatorContent playerId={playerId} locale={locale} />
    </Suspense> : <PlayerPlans playerId={playerId} />}
  </div>;
}
