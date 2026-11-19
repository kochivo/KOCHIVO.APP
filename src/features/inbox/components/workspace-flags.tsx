'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { workspaceMessages } from '../workspace-messages';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { workspaceTriage } from '../workspace-triage';
export function WorkspaceFlags({ item, inputs, now }: { item: WorkspaceItem; inputs: TriageInputs; now: Date }) {
  const t = useT(messages), locale = useLocale();
  const workspaceT = useT(workspaceMessages);
  const flags = workspaceTriage(item, inputs, now).flags;
  if (item.kind === 'assessment') return item.answers.some(answer => answer.alert) && <div className="flex flex-wrap gap-inline px-page-x pt-card">{item.answers.filter(answer => answer.alert).map(answer =>
    <span key={answer.id} className="rounded-full bg-warn-soft px-stack py-inline text-micro text-warn">{(locale === 'en' ? answer.label_en : answer.label_ar) || workspaceT('assessmentAlert')}</span>)}</div>;
  return flags.length > 0 && <div className="flex flex-wrap gap-inline px-page-x pt-card">{flags.map(flag => <span key={flag.key} className="rounded-full bg-warn-soft px-stack py-inline text-micro text-warn">
    {t(flag.key, Object.fromEntries(Object.entries(flag.values).map(([key, value]) => [key, formatNumber(Math.round(value * 10) / 10, locale)])), (flag.values.weeks ?? flag.values.days ?? flag.values.hours))}
  </span>)}</div>;
}
