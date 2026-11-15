'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { buttonClass } from '@/ui/button';
import { messages } from '../budget/messages';
import { weeklyShoppingList } from '../budget-plan';
import type { BudgetDay } from '../budget-plan';

export function ShoppingList({ days }: { days: BudgetDay[] }) {
  const t = useT(messages), locale = useLocale();
  const { items, total } = weeklyShoppingList(days);
  const lines = items.map(item => `${item.food.name}: ${formatNumber(item.units, locale)} ${t(item.food.unit)} · ${t('money', { n: formatNumber(item.costEgp, locale) })}`);
  const totalText = `${t('total')}: ${t('money', { n: formatNumber(total, locale) })}`;
  return <section className="space-y-stack">
    <h2 className="text-title font-semibold">{t('shopping')}</h2>
    {!items.length ? <p className="text-muted">{t('noItems')}</p> : <>
      <ul className="space-y-stack">{lines.map((line, index) => <li key={items[index]?.food.id} className="glass rounded-control p-stack"><bdi>{line}</bdi></li>)}</ul>
      <p className="glass-strong rounded-control p-card font-bold"><bdi>{totalText}</bdi></p>
      <p className="text-xs text-muted">{t('estimate')}</p>
      <a href={`https://wa.me/?text=${encodeURIComponent([...lines, totalText].join('\n'))}`} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', block: true })}>{t('share')}</a>
    </>}
  </section>;
}
