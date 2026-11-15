import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { TextField } from '@/ui/text-field';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';

export function Roster({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), [query, setQuery] = useState('');
  const names = [...t('names').split('|').slice(0, state.n), ...state.invites].filter(n => n.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <GlassCard className="grid gap-stack p-card"><h3>{t('players')} · {state.n + state.invites.length}</h3><TextField label={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
    {names.map((name, i) => <DemoRow key={`${name}-${i}`} title={name} detail={t('packages').split('|')[i % 3]} onClick={() => dispatch({ type: 'go', page: 'player', now: now() })} />)}
    {!names.length && <div className="p-card text-sm"><b>{t('empty')}</b><p className="text-muted">{t('emptyDetail')}</p></div>}
  </GlassCard>;
}
