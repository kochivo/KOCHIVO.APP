'use client';
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
  return <div id="queue-heading" tabIndex={-1} className="space-y-4">
    <PageBarTitle title={t('title')} subtitle={t('subtitle')} />
    {!data ? <TasksState kind={resource.error ? 'error' : 'loading'} retry={resource.retry} /> : <>
      {(failed || resource.error) && <p role="alert" className="text-sm text-danger">{t(failed ? 'failed' : 'error')}</p>}
      {!tasks.length && !pending ? <TasksState kind="empty" /> : <>
        <div aria-label={t('title')} className={`flex w-max max-w-full gap-1 overflow-x-auto rounded-full border border-line-soft bg-bg/25 p-1 ${mobileOpen ? 'max-[759px]:hidden' : ''}`}>
          {taskTabs.map(tab => <button key={tab} aria-pressed={filter === tab} disabled={pending} onClick={() => { setFilter(tab); setMobileOpen(false); }}
            className={`min-h-12 shrink-0 whitespace-nowrap rounded-full px-3 text-xs ${filter === tab ? 'glass-strong text-ink' : 'text-muted'}`}>
            {t(tab)} <span className="ms-1 tabular-nums">{formatNumber(counts[tab], locale)}</span></button>)}
        </div>
        <div className="grid items-start gap-4 min-[760px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className={`glass min-w-0 rounded-card p-[18px] ${mobileOpen ? 'max-[759px]:hidden' : ''}`}>
            {visible.length ? <ul aria-label={t('title')}>{visible.map(task => <TaskRow key={task.id} task={task} selected={selected?.id === task.id}
              first={tasks[0]?.id === task.id} pending={pending} onSelect={() => open(task)} onAction={() => void action(task)} />)}</ul>
              : <p role="status" className="py-12 text-center text-sm text-muted">{t('filterEmpty')}</p>}
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
