'use client';
import { useT } from '@/core/i18n/client';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { taskKey } from '../workspace-model';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceRow } from './workspace-row';
export function WorkspaceList({ attention, routine, selected, inputs, now, onSelect }: {
  attention: WorkspaceItem[]; routine: WorkspaceItem[]; selected: WorkspaceItem | null; inputs: TriageInputs; now: Date;
  onSelect: (item: WorkspaceItem) => void;
}) {
  const t = useT(workspaceMessages);
  return <div className="glass overflow-hidden rounded-card border border-line-soft lg:sticky lg:top-[75px]">
    {!attention.length && !routine.length ? <p className="p-5 text-sm text-faint">{t('noMatches')}</p> :
      ([['attention', attention], ['routine', routine]] as const).map(([group, items]) => items.length > 0 && <section key={group} aria-label={t(group)}>
        <h2 className="px-4 pb-1 pt-3 text-[11px] text-faint">{t(group)}</h2>
        <ul className="deferred-rows divide-y divide-line-soft">{items.map(item => <li key={taskKey(item)}>
          <WorkspaceRow item={item} inputs={inputs} now={now} selected={selected ? taskKey(selected) === taskKey(item) : false} onSelect={() => onSelect(item)} />
        </li>)}</ul>
      </section>)}
  </div>;
}
