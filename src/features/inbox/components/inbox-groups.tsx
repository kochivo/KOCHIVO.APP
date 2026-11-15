'use client';

import type { ReactElement } from 'react';
import { CheckCheck } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../messages';
import type { TriageResult } from '../triage';

type Group = TriageResult['group'];
export function InboxGroups({ children, filter, onFilter, loading = false }: {
  children: ReactElement<{ 'data-group': Group }>[];
  filter: 'all' | Group; onFilter: (filter: 'all' | Group) => void;
  loading?: boolean;
}) {
  const t = useT(messages);
  return <div className="space-y-card-gap">
    <div role="group" aria-label={t('triageFilter')} className="flex flex-wrap gap-inline">
      {(['all', 'attention', 'routine'] as const).map(group => <button key={group} type="button"
        aria-pressed={filter === group} onClick={() => onFilter(group)}
        className={`glass min-h-12 rounded-full px-page-x ${filter === group ? 'text-lime' : 'text-muted'}`}>{t(group)}</button>)}
    </div>
    {loading ? <LoadingState variant="list" aria-label={t('loading')} /> :
      (['attention', 'routine'] as const).filter(group => filter === 'all' || filter === group).map(group => {
      const rows = children.filter(child => child.props['data-group'] === group);
      return <section key={group} aria-label={t(group)} className="space-y-stack">
        <h2 className="text-xl font-bold">{t(group)}</h2>
        {rows.length ? <ul className="space-y-stack">{rows}</ul> :
          <EmptyState icon={CheckCheck} title={t('caughtUp')} body={t('noPendingBody')} />}
      </section>;
    })}
  </div>;
}
