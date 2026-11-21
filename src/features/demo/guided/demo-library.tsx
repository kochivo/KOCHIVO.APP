import { useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { mealPlanCalories } from './meal-calories';
import { guidedMessages } from './messages';

/** A local library entry point, with no account routes or create/assign side effects. */
export function DemoLibrary({ kind, onOpen }: { kind: 'programs' | 'food'; onOpen: () => void }) {
  const t = useT(guidedMessages), [query, setQuery] = useState('');
  const titles = kind === 'programs' ? [t('programTitle')] : [t('foodTitle')];
  return <section className="grid gap-card-gap">
    <label className="recessed flex min-h-12 items-center gap-inline rounded-control px-card"><Search aria-hidden className="size-4 text-muted" /><input type="search" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={t('librarySearch')} placeholder={t(kind === 'programs' ? 'programs' : 'food')} value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="demo-library-grid">{titles.filter(title => title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(title => <GlassCard key={title} className="grid gap-stack">
      <div className="flex items-start justify-between gap-inline"><h3 className="text-md font-bold">{title}</h3><span className="tone-lime rounded-control px-inline text-micro">{kind === 'programs' ? t('day', { n: 4 }) : t('calories', { n: mealPlanCalories })}</span></div>
      {kind === 'food' && <><div className="flex h-2 overflow-hidden rounded-full" aria-hidden><span className="w-[34%] bg-lime" /><span className="w-[50%] bg-info" /><span className="flex-1 bg-warn" /></div><p className="text-xs text-muted">{t('macroNames').split('|').map((name, i) => `${name} ${[170, 250, 63][i]}`).join(' · ')}</p></>}
      <footer className="mt-stack flex items-center justify-between gap-inline border-t border-line-soft pt-stack"><span className="text-xs text-muted">{t('names').split('|')[0]}</span><Button block={false} variant="secondary" onClick={onOpen}>{t('overview')}</Button></footer>
    </GlassCard>)}</div>
  </section>;
}
