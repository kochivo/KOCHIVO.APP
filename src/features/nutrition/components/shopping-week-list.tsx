'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodBudgetMessages } from '@/features/meal-plans';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { aisles } from '../shopping-items';
import type { shoppingItems } from '../shopping-items';
import { messages as nutritionMessages } from '../messages';
import { readShoppingChecks, writeShoppingChecks } from '../data/shopping-checks';
import { messages } from '../player-v4/messages';

export function ShoppingWeekList({ items, total, hasEstimate, listKey }: ReturnType<typeof shoppingItems> & { listKey?: string }) {
  const t = useT(messages), budget = useT(foodBudgetMessages), locale = useLocale();
  const labels = useT(nutritionMessages);
  const [checked, setChecked] = useState(() => readShoppingChecks(listKey));
  function saveChecks(next: Set<string>) {
    setChecked(next);
    writeShoppingChecks(listKey, next);
  }
  const [selectedAisle, setSelectedAisle] = useState<typeof aisles[number] | 'all'>('all');
  const number = (value: number) => formatNumber(value, locale);
  const price = (value: number) => budget('money', { n: number(value) });
  const groups = aisles.flatMap(aisle => {
    const rows = items.filter(item => item.aisle === aisle);
    return rows.length ? [{ aisle, rows }] : [];
  });
  const filter = groups.some(group => group.aisle === selectedAisle) ? selectedAisle : 'all';
  const amount = (item: typeof items[number]) => `${number(item.quantity)} ${item.unit === 'grams' ? t('grams') : budget(item.unit)}`;
  const totalLabel = items.some(item => item.cost === undefined) ? t('pricedOnly') : budget('total');
  const totalText = `${totalLabel}: ${price(total)}`;
  const share = items.map(item => `${item.name}: ${amount(item)}${item.cost === undefined ? '' : ` · ${price(item.cost)}`}`);
  if (hasEstimate) share.push(totalText);
  return <>
    {!items.length && <p className="glass rounded-card p-card text-muted">{t('empty')}</p>}
    {groups.length > 0 && <div role="group" aria-label={t('aisles')} className="flex gap-inline overflow-x-auto">
      {(['all', ...groups.map(group => group.aisle)] as const).map(key => <Button key={key} variant={selectedAisle === key ? 'secondary' : 'ghost'}
        className="shrink-0 px-stack text-xs" aria-pressed={filter === key} onClick={() => setSelectedAisle(key)}>{t(key)}</Button>)}
    </div>}
    {groups.filter(group => filter === 'all' || group.aisle === filter)
      .map(({ aisle, rows }) => <section key={aisle} data-shopping-section={aisle} className="glass overflow-hidden rounded-card">
      <h2 className="px-card py-stack text-sm font-bold">{t(aisle)}</h2>
      <ul>{rows.map(item => <li key={item.id} className="border-t border-line-soft">
        <label className="flex min-h-14 cursor-pointer items-center gap-stack px-card py-stack">
          <input type="checkbox" checked={checked.has(item.id)} className="peer sr-only" onChange={event => {
            const selected = event.target.checked;
            const next = new Set(checked);
            if (selected) next.add(item.id); else next.delete(item.id);
            saveChecks(next);
          }} />
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-control border border-line text-transparent peer-checked:border-lime peer-checked:bg-lime peer-checked:text-on-lime peer-focus-visible:ring-2 peer-focus-visible:ring-lime">
            <Check className="size-4" />
          </span>
          <span className="min-w-0 flex-1 break-words text-sm peer-checked:text-muted peer-checked:line-through">{item.name}</span>
          <span className="shrink-0 text-end text-micro text-muted"><bdi>{amount(item)}</bdi>
            {item.cost !== undefined && <bdi className="block">{price(item.cost)}</bdi>}</span>
        </label>
      </li>)}</ul>
    </section>)}
    {hasEstimate && <section data-shopping-section="cost" className="glass-strong space-y-inline rounded-card p-card">
      <p className="font-bold"><bdi>{totalText}</bdi></p><p className="text-xs text-muted">{budget('estimate')}</p>
    </section>}
    {items.some(item => checked.has(item.id)) && <Button variant="secondary" block onClick={() => saveChecks(new Set())}>{labels('resetShoppingChecks')}</Button>}
    {items.length > 0 && <a href={`https://wa.me/?text=${encodeURIComponent(share.join('\n'))}`} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', block: true })}>{budget('share')}</a>}
  </>;
}
