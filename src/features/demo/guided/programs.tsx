import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/text-field';
import { Chip } from '@/ui/chip';
import { KoPlus } from '@/ui/icons/ko-plus';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';

export function Programs({ state, dispatch, act }: PaneProps) {
  const t = useT(guidedMessages), [library, setLibrary] = useState(false), [query, setQuery] = useState('');
  const ex = t('exercises').split('|'), indices = [[0, 1, 2, 3], [4, 5, 6], [7, 8], [9, 10]][state.day] ?? [];
  const choices = t('library').split('|').filter(x => x.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <><h3>{t('programTitle')}</h3><div className="flex flex-wrap gap-inline">{t('days').split('|').map((name, day) => <Chip key={day} pressed={state.day === day} onClick={() => { dispatch({ type: 'patch', patch: { day } }); setLibrary(false); }}>{t('day', { n: day + 1 })} · {name}</Chip>)}</div>
    <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard className="grid gap-stack p-card">
      {indices.map((i, j) => <DemoRow key={i} title={ex[i]} detail={j === 0 ? '4 × 8' : '3 × 12'} />)}
      {state.day === 0 && state.added.map((name, i) => <DemoRow key={i} title={name} detail="3 × 12" />)}
      {state.day === 0 && <div data-demo-target="addex" className="grid gap-stack"><Button variant="secondary" onClick={() => setLibrary(!library)} aria-expanded={library}><KoPlus className="size-5" />{t('addExercise')}</Button>
        {library && <><TextField label={t('librarySearch')} value={query} onChange={e => setQuery(e.target.value)} />{choices.map(name => <Button key={name} variant="secondary" onClick={() => { act('addex', name); setLibrary(false); }}>{name}<KoPlus className="size-5" /></Button>)}{!choices.length && <p className="text-sm text-muted">{t('noExercise')}</p>}</>}
      </div>}
    </GlassCard><GlassCard className="grid content-start gap-stack p-card"><DemoRow title={t('names').split('|')[0]} detail={t('day', { n: state.day + 1 })} /><p className="text-sm text-muted">{t('reachesPlayer')}</p></GlassCard></div>
  </>;
}
