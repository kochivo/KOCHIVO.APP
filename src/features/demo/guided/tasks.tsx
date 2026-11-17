import { useState } from 'react';
import { useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 shares the real task presentation leaves. */
import { TaskRow } from '@/features/captain-workspace/queue/task-row';
import { taskMessages } from '@/features/captain-workspace/queue/messages';
import type { CaptainTask } from '@/features/captain-workspace/queue/tasks-model';
/* eslint-enable no-restricted-imports */
import type { PaneProps } from './types';
import { guidedMessages } from './messages';

export function Tasks({ state, act, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), tt = useT(taskMessages), names = t('names').split('|');
  const [selected, setSelected] = useState<string | null>(null);
  const tasks: CaptainTask[] = [
    ...(!state.approved ? [{ id: 'review', kind: 'checkin' as const, playerId: 'sara', name: names[1] ?? '', at: '2026-11-15' }] : []),
    ...(!state.nudged ? [{ id: 'nudge', kind: 'absent' as const, playerId: 'omar', name: names[2] ?? '', at: '2026-11-11', days: 4 }] : []),
    ...(!state.renewed ? [{ id: 'renew', kind: 'renew' as const, playerId: 'ali', name: names[3] ?? '', at: '2026-11-16', days: 1 }] : []),
  ];
  const action = (task: CaptainTask) => task.id === 'review' ? dispatch({ type: 'go', page: 'assess', now: now() }) : act(task.id);
  return <section className="demo-tasks glass min-w-0 rounded-card p-card">
    {tasks.length ? <ul aria-label={tt('title')}>{tasks.map((task, index) => <TaskRow key={task.id} task={task}
      selected={selected === task.id} first={index === 0} pending={false} onSelect={() => { setSelected(task.id); action(task); }} onAction={() => action(task)} />)}</ul>
      : <p role="status" className="py-section text-center text-sm text-muted">{t('allDone')}</p>}
  </section>;
}
