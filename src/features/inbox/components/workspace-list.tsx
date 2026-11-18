'use client';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { taskKey } from '../workspace-model';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceRow } from './workspace-row';
export function WorkspaceList({ attention, routine, selected, inputs, now, onSelect, onReset }: {
  attention: WorkspaceItem[]; routine: WorkspaceItem[]; selected: WorkspaceItem | null; inputs: TriageInputs; now: Date;
  onSelect: (item: WorkspaceItem) => void; onReset?: () => void;
}) {
  const t = useT(workspaceMessages);
  const empty = !attention.length && !routine.length;
  return <div className="glass overflow-hidden rounded-card border border-line-soft lg:sticky lg:top-[75px]">
    <p role="status" className={empty ? 'p-card text-sm text-faint' : 'sr-only'}>{empty ? t('noMatches') : null}</p>
    {empty ? onReset && <Button variant="secondary" block={false} className="mx-card mb-card" onClick={onReset}>{t('resetFilters')}</Button> :
      ([['attention', attention], ['routine', routine]] as const).map(([group, items]) => items.length > 0 && <section key={group} aria-label={t(group)}>
        <h2 className="px-page-x pb-inline pt-stack text-micro text-faint">{t(group)}</h2>
        <ul className="deferred-rows divide-y divide-line-soft">{items.map(item => <li key={taskKey(item)}>
          <WorkspaceRow item={item} inputs={inputs} now={now} selected={selected ? taskKey(selected) === taskKey(item) : false} onSelect={() => onSelect(item)} />
        </li>)}</ul>
      </section>)}
  </div>;
}
