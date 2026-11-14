import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from '../messages';
import type { subscriptionTiles } from './workspace-billing-summary';

export function WorkspaceBillingTiles({ values }: { values: Omit<ReturnType<typeof subscriptionTiles>, 'pending'> & { pending: number | null } }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const tiles = [
    { key: 'income', tone: 'text-calm' }, { key: 'pending', tone: 'text-warn' },
    { key: 'ending', tone: 'text-warn' }, { key: 'active', tone: 'text-lime' },
  ] as const;
  return <div className="grid grid-cols-2 gap-4 min-[761px]:grid-cols-4">
    {tiles.map(({ key, tone }) => <div key={key} className="glass-strong flex min-w-0 items-center gap-3 rounded-card border border-line-soft p-[18px]">
      <svg aria-hidden viewBox="0 0 40 40" className={`size-9 shrink-0 -rotate-90 min-[761px]:size-11 ${tone}`}>
        <circle cx="20" cy="20" r="16" fill="none" className="stroke-line" strokeWidth="3" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" pathLength="1" strokeDasharray={values[key] ? '1 0' : '0 1'} />
      </svg>
      <div className="min-w-0"><b className="block break-words font-display text-2xl leading-tight tabular-nums">{values[key] == null ? null : formatNumber(values[key], locale)}</b>
        <small className="text-xs text-muted">{t(key)}</small></div>
    </div>)}
  </div>;
}
