'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { dailyAverages, previousCheckins } from '../triage';
import { ageLabel } from '../merge';
import { taskKey } from '../workspace-model';
import { workspaceMessages } from '../workspace-messages';

export function WorkspaceRow({ item, inputs, now, selected, onSelect }: {
  item: WorkspaceItem; inputs: TriageInputs; now: Date; selected: boolean; onSelect: () => void;
}) {
  const t = useT(workspaceMessages), locale = useLocale();
  let flag = item.kind === 'assessment' ? t('assessmentFlag') : item.kind === 'request' ? t('requestFlag') : '';
  let color = item.kind === 'request' ? 'bg-lime-soft text-lime' : 'bg-surface-raised text-muted';
  if (item.kind === 'checkin') {
    const previous = previousCheckins(item, inputs.history)[0]?.body_weight_kg;
    if (previous != null && item.body_weight_kg != null) {
      const change = Math.round((item.body_weight_kg - previous) * 10) / 10;
      flag = t('kg', { value: `${change > 0 ? '+' : ''}${formatNumber(change, locale)}` }); color = 'bg-lime-soft text-lime';
    }
    const soreness = dailyAverages(item.player_id, inputs.dailyChecks, now, item.timezone).soreness;
    if (soreness != null && soreness >= 4) { flag = t('soreness'); color = 'bg-danger-soft text-danger'; }
  }
  return <button id={`task-${taskKey(item)}`} aria-pressed={selected} onClick={onSelect}
    className={`flex min-h-16 w-full items-center gap-3 px-[18px] py-3.5 text-start ${selected ? 'bg-surface-raised' : 'hover:bg-surface-raised'}`}>
    <span aria-hidden className="glass grid size-[38px] shrink-0 place-items-center rounded-full border border-line text-xs">{item.player_name.slice(0, 1)}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm">{item.player_name}</span>
      <span className="mt-1 block text-[11.5px] text-faint">{item.kind === 'assessment' ? item.title : item.kind === 'request' ? t('requestKind') : t(item.kind)} · {ageLabel(item.created_at, now, locale)}</span></span>
    {flag && <span className={`rounded-full px-2.5 py-1 text-[11.5px] ${color}`}>{flag}</span>}
  </button>;
}
