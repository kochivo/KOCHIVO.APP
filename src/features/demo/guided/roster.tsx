import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 reuses the roster row without its billing loader. */
import { RosterRowView } from '@/features/roster/components/roster-row-view';
import { messages as rosterMessages } from '@/features/roster/messages';
/* eslint-enable no-restricted-imports */
import { GlassCard } from '@/ui/glass-card';
import { TextField } from '@/ui/text-field';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Roster({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), rt = useT(rosterMessages), locale = useLocale(), [query, setQuery] = useState('');
  const names = [...t('names').split('|').slice(0, state.n), ...state.invites].filter(n => n.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  // Row order follows the names list: 0 Mohamed, 1 Sara, 2 Omar (absent 4 days), 3 Mariam (ends in 3 days).
  const programs = t('programNames').split('|'), ends = ['2026-12-15', '2026-12-01', '2026-12-08', '2026-11-18', '2026-12-22', '2026-12-04', '2026-12-29', '2026-12-12'];
  const starts = ['2026-10-15', '2026-09-28', '2026-10-06', '2026-10-18', '2026-11-01', '2026-09-15', '2026-10-27', '2026-11-08'];
  const lastDates = ['2026-11-15', '2026-11-15', '2026-11-11', '2026-11-14', '2026-11-15', '2026-11-13', '2026-11-14', '2026-11-12'];
  return <GlassCard className="grid gap-stack p-card"><h3>{t('players')} · {state.n + state.invites.length}</h3><TextField label={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
    <div role="table" aria-label={rt('players')} className="space-y-stack lg:glass-strong lg:overflow-hidden lg:rounded-card lg:space-y-0">
      <div role="row" className="hidden px-card py-inline text-xs text-muted min-[760px]:grid min-[760px]:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_3rem] min-[760px]:gap-stack">
        {(['colPlayer', 'colLast', 'colUntil', 'colPackage'] as const).map(key => <span key={key} role="columnheader">{t(key)}</span>)}<span aria-hidden />
      </div>
      {names.map((name, i) => <RosterRowView key={`${name}-${i}`} player={{ playerId: `demo-player-${i}`, fullName: name,
        accessUntil: ends[i % ends.length] ?? '', startedOn: starts[i % starts.length] ?? '', lastTrainingDate: lastDates[i % lastDates.length] ?? '', programTitle: programs[i % programs.length] ?? '', openTasks: 0 }}
        today="2026-11-15" t={rt} locale={locale}
        billing={<span>{t('packages').split('|')[i % 3]}</span>}
        onSelect={href => dispatch({ type: 'go', page: href.includes('/chat') ? 'inbox' : href.includes('/programs') ? 'programs' : href.includes('/nutrition') ? 'food' : 'player', now: now() })} />)}
    </div>
    {!names.length && <div className="p-card text-sm"><b>{t('empty')}</b><p className="text-muted">{t('emptyDetail')}</p></div>}
  </GlassCard>;
}
