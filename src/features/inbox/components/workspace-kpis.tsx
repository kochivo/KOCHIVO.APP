'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { checkinKpis } from '../workspace-followup';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceKpis({ item, inputs }: { item: WorkspaceItem; inputs: TriageInputs }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const tiles = item.kind === 'checkin' ? checkinKpis(item, inputs.history) :
    (['weight', 'waist', 'adherence'] as const).map(key => ({ key, value: null, change: null }));
  return <dl className="grid grid-cols-2 gap-2.5 px-5 py-4 sm:grid-cols-3">{tiles.map(tile => <div key={tile.key} className="glass-strong rounded-2xl border border-line-soft px-3.5 py-3">
    <dt className="text-[11.5px] text-faint">{t(tile.key)}</dt>
    <dd><b className="my-1 block font-display text-[22px] font-extrabold tabular-nums">{tile.value === null ? t('dash') : formatNumber(tile.value, locale)}</b>
      {tile.change !== null && <span className={`block text-[11.5px] ${tile.change === 0 ? 'text-faint' : 'text-lime'}`}>
        {tile.change === 0 ? t('sameWeek') : t('change', { value: `${tile.change > 0 ? '+' : ''}${formatNumber(tile.change, locale)}` })}
      </span>}</dd>
  </div>)}</dl>;
}
