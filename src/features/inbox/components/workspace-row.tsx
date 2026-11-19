'use client';
import { clickableClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { taskKey } from '../workspace-model';
import { workspaceTriage } from '../workspace-triage';
import { checkinKpis, isOverdue } from '../workspace-followup';
import { followupAge } from '../workspace-age';
import { messages } from '../messages';
import { workspaceMessages } from '../workspace-messages';
import { TierBadge } from '@/ui/tier-badge';
export function WorkspaceRow({ item, inputs, now, selected, onSelect, idPrefix = 'task' }: {
  item: WorkspaceItem; inputs: TriageInputs; now: Date; selected: boolean; onSelect: () => void; idPrefix?: string;
}) {
  const t = useT(workspaceMessages), flagT = useT(messages), locale = useLocale(), style = useArabicStyle();
  const flag = workspaceTriage(item, inputs, now).flags[0];
  const values = Object.fromEntries(Object.entries(flag?.values ?? {}).map(([key, value]) => [key, formatNumber(Math.round(value * 10) / 10, locale)]));
  const kind = item.kind === 'checkin' ? t('weekly') : item.kind === 'form' ? t('videoKind') : item.kind === 'request' ? t('joinKind') : t('assessmentFlag');
  const weight = item.kind === 'checkin' ? checkinKpis(item, inputs.history)[0] : null;
  const summary = item.kind === 'checkin' ? item.body_weight_kg !== null ? `${t('weight')} ${formatNumber(item.body_weight_kg, locale)}${weight?.change != null ? ` (${formatNumber(weight.change, locale)})` : ''}` : item.notes
    : item.kind === 'form' ? item.exercise_name : item.kind === 'assessment' ? item.title : t('requestKind');
  return <button id={`${idPrefix}-${taskKey(item)}`} aria-pressed={selected} onClick={onSelect}
    className={`${clickableClass} relative grid min-h-16 w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-stack px-page-x py-card text-start ${selected ? 'bg-surface-raised' : 'hover:bg-surface-raised'}`}>
    {selected && <span className="absolute inset-y-0 start-0 w-[3px] bg-lime" aria-hidden />}
    <span aria-hidden className="glass grid size-[38px] place-items-center rounded-full border border-line text-xs">{item.player_name.slice(0, 1)}</span>
    <span className="min-w-0"><span className="flex flex-wrap items-center gap-inline text-sm font-medium">{item.player_name}
      <TierBadge tier={item.tier} />
      {(flag || item.kind === 'assessment' && item.answers.some(answer => answer.alert)) && <span className="rounded-full bg-warn-soft px-stack py-inline text-micro text-warn">{flag ? flagT(flag.key, values, (flag.values.weeks ?? flag.values.days ?? flag.values.hours)) : t('assessmentAlert')}</span>}</span>
      <span className="mt-inline block truncate text-micro text-faint">{kind}{summary && ` · ${summary}`}</span></span>
    <span className="flex items-center gap-inline"><span className={`text-end text-micro ${isOverdue(item, now) ? 'text-warn' : 'text-faint'}`}>{followupAge(item.created_at, now, locale, style)}</span><RowChevron /></span>
  </button>;
}
