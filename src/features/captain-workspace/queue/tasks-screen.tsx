'use client';
import { Button, clickableClass } from '@/ui/button';
import { PageBarActions } from '@/ui/page-bar-actions';
import { Segmented } from '@/ui/segmented';
import { StatStrip } from '@/ui/stat-strip';
import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { PageBarTitle } from '@/ui/page-bar-title';
import { formatNumber } from '@/lib/format';
import type { InboxItem } from '@/features/inbox';
import type { VoiceInput } from '@/features/chat';
import { loadTasks } from './data/tasks';
import { replyToTask, approveTaskSwap } from './data/task-actions';
import { taskMessages } from './messages';
import { filterTasks, taskCounts, taskTabs } from './tasks-model';
import type { CaptainTask, TaskFilter } from './tasks-model';
import { TaskRow } from './task-row';
import { TasksState } from './tasks-state';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
const Detail = dynamic(() => import('./task-detail').then(module => module.TaskDetail));
const Review = dynamic(() => import('./review-dialog').then(module => module.ReviewDialog));
export function TasksScreen() {
  const t = useT(taskMessages), locale = useLocale(), router = useRouter();
  const success = useT(successMessages), toast = useToast();
  const loader = useCallback(() => loadTasks(), []);
  const resource = useResource(`captain-tasks:${locale}`, loader);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [review, setReview] = useState<InboxItem | null>(null);
  const [workingTask, setWorkingTask] = useState<CaptainTask | null>(null);
  const [pending, setPending] = useState(false), [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const data = resource.data;
  const tasks = data?.tasks ?? [], visible = filterTasks(tasks, filter), counts = taskCounts(tasks);
  const selected = pending && workingTask ? workingTask : visible.find(task => task.id === selectedId) ?? visible[0];
  const firstTask = tasks[0];
  const extraTab = filter === 'all' || filter === 'checkin' || filter === 'receipt' ? 'video' : filter;
  function changeFilter(value: string) {
    const tab = taskTabs.find(key => key === value);
    if (tab) { setFilter(tab); setMobileOpen(false); }
  }
  function open(task: CaptainTask) { setSelectedId(task.id); setMobileOpen(true); }
  async function complete(task: CaptainTask, commit: () => Promise<void>) {
    if (!data || busy.current) return false;
    busy.current = true; setWorkingTask(task); setPending(true); setFailed(false);
    try {
      const ok = await resource.mutate(current => ({ ...(current ?? data), tasks: (current ?? data).tasks.filter(row => row.id !== task.id) }), commit);
      if (!ok) { setFailed(true); setSelectedId(task.id); }
      else setMobileOpen(false);
      return ok;
    } finally { busy.current = false; setPending(false); }
  }
  async function action(task: CaptainTask) {
    if (!data || busy.current) return;
    if (task.kind === 'receipt') { router.push(`/${locale}/captain/billing#receipt-${task.id.slice('receipt:'.length)}`); return; }
    if (task.kind === 'video') { open(task); return; }
    if (task.kind === 'checkin' && task.item) { open(task); setReview(task.item); return; }
    if (task.kind === 'program') {
      await complete(task, async () => {});
      router.push(`/${locale}/captain/players/${task.playerId}/programs`);
      return;
    }
    if (task.kind === 'swap') { await complete(task, () => approveTaskSwap(task)); return; }
    const body = t(task.kind === 'renew' ? 'reminder' : 'absentMessage', { days: task.days ?? 0 });
    await complete(task, () => replyToTask(task, data.captainId, body));
  }
  async function send(body: string, voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds' | 'id'>) {
    if (!selected || !data) return false;
    const task = selected;
    const ok = await complete(task, () => replyToTask(task, data.captainId, body, voice));
    if (ok) toast.success({ title: success('replyNamed', { name: task.name }), detail: success('name', { name: task.item?.kind === 'form' ? task.item.exercise_name : t('checkinTag') }), icon: task.kind === 'video' || task.kind === 'checkin' ? 'form' : 'message' });
    return ok;
  }
  return <div id="queue-heading" tabIndex={-1} className="space-y-card-gap">
    <PageBarTitle title={t('title')} subtitle={t('subtitle')} />
    {firstTask && <PageBarActions><Button disabled={pending} onClick={() => { setFilter('all'); open(firstTask); }}>{t('startFirst')}</Button></PageBarActions>}
    {!data ? <TasksState kind={resource.error ? 'error' : 'loading'} retry={resource.retry} /> : <>
      {(failed || resource.error) && <p role="alert" className="text-sm text-danger">{t(failed ? 'failed' : 'error')}</p>}
      {!tasks.length && !pending ? <TasksState kind="empty" /> : <>
        <StatStrip items={(['all', 'checkin', 'receipt', 'program'] as const).map(key => ({
          label: t(key), value: formatNumber(counts[key], locale),
        }))} />
        <div className="grid items-start gap-card-gap min-[760px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className={`glass min-w-0 overflow-hidden rounded-card ${mobileOpen ? 'max-[759px]:hidden' : ''}`}>
            <fieldset disabled={pending} className="min-w-0 space-y-stack px-card pt-card pb-stack">
              <Segmented aria-label={t('filterByType')} value={filter}
                options={[{ value: 'all', label: t('all') }, { value: 'checkin', label: t('checkin') },
                  { value: 'receipt', label: t('receipt') }, { value: extraTab, label: t(extraTab) }]}
                onChange={changeFilter} />
              <select aria-label={t('filterByType')} value={filter} className={`${clickableClass} glass min-h-12 max-w-full rounded-control px-stack text-sm`}
                onChange={event => changeFilter(event.target.value)}>
                {taskTabs.map(tab => <option key={tab} value={tab}>{t(tab)} ({formatNumber(counts[tab], locale)})</option>)}
              </select>
            </fieldset>
            {visible.length ? <ul aria-label={t('title')}>{visible.map(task => <TaskRow key={task.id} task={task} selected={selected?.id === task.id}
              pending={pending} onSelect={() => open(task)} onAction={() => void action(task)} />)}</ul>
              : <p role="status" className="py-section text-center text-sm text-muted">{t('filterEmpty')}</p>}
          </section>
          {selected && <div className={mobileOpen ? '' : 'max-[759px]:hidden'}><Detail key={selected.id} task={selected} pending={pending} onBack={() => setMobileOpen(false)} onSend={send} /></div>}
        </div>
      </>}
      {review && <Review item={review} inputs={data.triage} now={new Date(data.at)} onClose={() => setReview(null)} onReviewed={async (_item, commit) => {
        const task = tasks.find(row => row.item?.id === review.id && row.item.kind === review.kind);
        if (!task || !await complete(task, commit)) throw new Error(t('failed'));
        setReview(null);
      }} />}
    </>}
  </div>;
}
