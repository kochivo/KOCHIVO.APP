import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { homeMessages, homeV11Messages } from './messages';
import { HomeRing } from './home-ring';

export async function HomeTiles({ adherence, previous, trained, active, pending, paid, progress }: {
  adherence: number; previous: number; trained: number; active: number; pending: number; paid: number; progress: number;
}) {
  const [t, old, locale] = await Promise.all([getT(homeV11Messages), getT(homeMessages), getLocale()]);
  const number = (value: number) => formatNumber(value, locale);
  const delta = adherence - previous;
  const tiles = [
    { label: old('adherence'), value: old('percent', { value: number(adherence) }), ring: adherence / 100, tone: 'text-lime',
      delta: `${delta > 0 ? '+' : ''}${number(delta)}%` },
    { label: t('trained'), value: `${number(trained)}/${number(active)}`, ring: active ? trained / active : 0, tone: 'text-lime' },
    { label: t('waitingTasks'), value: number(pending), ring: 1 - progress, tone: 'text-danger', href: '/captain/inbox' },
    { label: t('revenue'), value: number(paid), ring: 1, tone: 'text-calm', href: '/captain/billing' },
  ];
  const className = 'glass-strong flex min-h-12 min-w-0 items-center gap-3 rounded-card p-3 text-start min-[760px]:p-[18px]';
  return <div data-home-tiles className="grid grid-cols-2 gap-3 min-[1000px]:grid-cols-4">{tiles.map(tile => {
    const content = <>{tile.ring !== undefined && <HomeRing value={tile.ring} tone={tile.tone} />}
      <div className="min-w-0"><b className="block font-display text-xl leading-tight font-extrabold tracking-[-.02em] tabular-nums min-[760px]:text-2xl">{tile.value}</b>
        <small className="text-xs text-muted">{tile.label}</small></div>
      {tile.delta && <span className={`ms-auto hidden self-start text-[11px] font-bold min-[1100px]:block ${delta < 0 ? 'text-danger' : 'text-lime'}`}>{tile.delta}</span>}</>;
    return tile.href ? <Link key={tile.label} href={tile.href} className={className}>{content}</Link> : <div key={tile.label} className={className}>{content}</div>;
  })}</div>;
}
