import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
// eslint-disable-next-line no-restricted-imports -- T-288 reuses the real program prescription view.
import { ProgramPrescriptionRow } from '@/features/captain-workspace/training/program-prescription-row';
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
  const ex = t('exercises').split('|'), indices = [[0, 1, 2, 3], [4, 5, 6], [7, 8], [9, 10]][state.day] ?? [], locale = useLocale();
  const row = (name: string, id: string, first = false) => ({ id, sets: first ? 4 : 3, reps_min: first ? 8 : 12,
    reps_max: first ? 8 : 12, rest_seconds: 90, library: { name_ar: name, name_en: name, media_path: null } });
  const choices = t('library').split('|').filter(x => x.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <><h3>{t('programTitle')}</h3><div className="flex flex-wrap gap-inline">{t('days').split('|').map((name, day) => <Chip key={day} pressed={state.day === day} onClick={() => { dispatch({ type: 'patch', patch: { day } }); setLibrary(false); }}>{t('day', { n: day + 1 })} · {name}</Chip>)}</div>
    <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard className="grid gap-stack p-card">
      <ul>{indices.map((i, j) => <ProgramPrescriptionRow key={i} row={row(ex[i] ?? '', `exercise-${i}`, j === 0)} locale={locale} />)}
      {state.day === 0 && state.added.map((name, i) => <ProgramPrescriptionRow key={`added-${i}`} row={row(name, `added-${i}`)} locale={locale} />)}</ul>
      {state.day === 0 && <div data-demo-target="addex" className="grid gap-stack"><Button variant="secondary" onClick={() => setLibrary(!library)} aria-expanded={library}><KoPlus className="size-5" />{t('addExercise')}</Button>
        {library && <><TextField label={t('librarySearch')} value={query} onChange={e => setQuery(e.target.value)} />{choices.map(name => <Button key={name} variant="secondary" onClick={() => { act('addex', name); setLibrary(false); }}>{name}<KoPlus className="size-5" /></Button>)}{!choices.length && <p className="text-sm text-muted">{t('noExercise')}</p>}</>}
      </div>}
    </GlassCard><GlassCard className="grid content-start gap-stack p-card"><DemoRow title={t('names').split('|')[0]} detail={t('day', { n: state.day + 1 })} /><p className="text-sm text-muted">{t('reachesPlayer')}</p></GlassCard></div>
  </>;
}
