import { useState } from 'react';
import { Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- Reuse the current workspace's pure status and week presentation. */
import { messages } from '@/features/roster/v6/messages';
import { WeekDots } from '@/features/roster/v6/week-dots';
import { matchesTab, playerStatus, tabCounts, tabs } from '@/features/roster/v6/model';
import type { Tab } from '@/features/roster/v6/model';
import type { RosterPlayer } from '@/features/roster/types';
/* eslint-enable no-restricted-imports */
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Roster({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), rt = useT(messages), locale = useLocale();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<Tab>('all');
  const fixtures = t('names').split('|');
  const names = [...Array.from({ length: state.n }, (_, i) => fixtures[i] ?? `${t('player')} ${i + 1}`), ...state.invites];
  const programs = t('programNames').split('|');
  const players: RosterPlayer[] = names.map((fullName, i) => ({ fullName, playerId: `demo-player-${i}`,
    accessUntil: i === 3 ? '2026-11-18' : '2026-12-15', startedOn: '2026-10-15',
    lastTrainingDate: i === 2 ? '2026-11-11' : '2026-11-15', programTitle: programs[i % programs.length] ?? '', openTasks: i === 1 ? 1 : 0 }));
  const counts = tabCounts(players, '2026-11-15');
  const rows = players.filter(player => matchesTab(player, filter, '2026-11-15') && player.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const go = () => dispatch({ type: 'go', page: 'player', now: now() });
  return <section className="grid gap-card-gap">
    <label className="recessed flex min-h-12 items-center gap-inline rounded-control border border-line px-card"><Search aria-hidden className="size-4 text-muted" />
      <input type="search" aria-label={t('search')} placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    <div className="demo-roster-filters flex max-w-full gap-inline overflow-x-auto rounded-full border border-line p-inline">{tabs.map(tab => <button type="button" key={tab} aria-pressed={filter === tab} onClick={() => setFilter(tab)}
      className={`min-h-12 shrink-0 rounded-full px-stack text-micro ${filter === tab ? 'glass-strong text-ink' : 'text-muted'}`}>{rt(tab)} <span className="ms-inline">{counts[tab]}</span></button>)}</div>
    <div className="glass overflow-hidden rounded-card"><table className="demo-roster-table w-full border-collapse text-start" aria-label={rt('players')}>
      <thead><tr>{(['player', 'week', 'weight', 'rpe', 'subscription', 'status'] as const).map(key => <th key={key} className="border-b border-line-soft px-stack py-inline text-start text-xs font-medium text-faint">{rt(key)}</th>)}</tr></thead>
      <tbody>{rows.map((player, i) => { const status = playerStatus(player, '2026-11-15');
        return <tr key={player.playerId} className="demo-roster-row relative border-b border-line-soft text-row last:border-0">
          <td className="px-stack py-inline"><button type="button" onClick={go} className="demo-roster-name flex min-h-12 w-full items-center gap-stack text-start"><span aria-hidden className="glass-strong grid size-10 shrink-0 place-items-center rounded-control font-bold text-lime">{player.fullName[0]}</span><span className="min-w-0"><b className="block truncate">{player.fullName}</b><small className="text-muted">{rt('gain')}</small></span></button></td>
          <td className="px-stack py-inline"><WeekDots today="2026-11-15" startedOn={player.startedOn} activity={{ dates: ['2026-11-14', ...(i === 2 ? [] : ['2026-11-15'])], weekdays: [0, 2, 4], rpe: null, video: false }} /></td>
          <td className="px-stack py-inline tabular-nums">{80.6 - i}</td><td className="px-stack py-inline">{rt('unknown')}</td>
          <td className="px-stack py-inline">{rt('dayCount', { n: i === 3 ? 3 : 30, count: i === 3 ? 3 : 30 })}</td>
          <td className="px-stack py-inline"><span className={`inline-flex whitespace-nowrap rounded-full border px-stack py-inline text-micro ${status.tone === 'lime' ? 'border-lime/20 bg-lime-soft text-lime' : 'border-warn/20 bg-warn-soft text-warn'}`}>{rt(status.key === 'good' ? 'okay' : status.key, { n: status.count, count: status.count })}</span></td>
        </tr>;
      })}</tbody>
    </table></div>{!rows.length && <p role="status" className="glass rounded-card p-card text-sm text-muted">{t('empty')}</p>}
    <span className="sr-only">{locale}</span>
  </section>;
}
