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
  return <GlassCard className="grid gap-stack p-card"><h3>{t('players')} · {state.n + state.invites.length}</h3><TextField label={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
    <div role="table" aria-label={rt('players')} className="space-y-stack lg:glass-strong lg:overflow-hidden lg:rounded-card lg:space-y-0">
      {names.map((name, i) => <RosterRowView key={`${name}-${i}`} player={{ playerId: `demo-player-${i}`, fullName: name,
        accessUntil: '2026-12-15', startedOn: '2026-10-15', lastTrainingDate: '2026-11-15', programTitle: t('programTitle'), openTasks: 0 }}
        today="2026-11-15" t={rt} locale={locale}
        billing={<span>{t('packages').split('|')[i % 3]}</span>}
        onSelect={href => dispatch({ type: 'go', page: href.includes('/chat') ? 'inbox' : href.includes('/programs') ? 'programs' : href.includes('/nutrition') ? 'food' : 'player', now: now() })} />)}
    </div>
    {!names.length && <div className="p-card text-sm"><b>{t('empty')}</b><p className="text-muted">{t('emptyDetail')}</p></div>}
  </GlassCard>;
}
