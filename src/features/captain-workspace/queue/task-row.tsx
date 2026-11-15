'use client';
import { clickableClass, Button } from '@/ui/button';
import Image from 'next/image';
import { RowChevron } from '@/ui/row-chevron';
import { useT } from '@/core/i18n/client';
import { taskMessages } from './messages';
import { taskText, taskTag } from './task-copy';
import type { CaptainTask } from './tasks-model';

export function TaskRow({ task, selected, first, pending, onSelect, onAction }: {
  task: CaptainTask; selected: boolean; first: boolean; pending: boolean; onSelect: () => void; onAction: () => void;
}) {
  const t = useT(taskMessages);
  const tagColor = task.kind === 'video' || task.kind === 'absent' ? 'bg-warn-soft text-warn'
    : task.kind === 'renew' || task.kind === 'program' ? 'bg-calm/10 text-calm' : 'bg-surface-raised text-muted';
  return <li className={`flex items-center gap-3 rounded-control border-line-soft p-2.5 [&+li]:border-t ${selected ? 'bg-surface-raised' : ''}`}>
    <button aria-pressed={selected} onClick={onSelect} className={`${clickableClass} flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start`}>
      <span className="glass grid size-10 shrink-0 place-items-center overflow-hidden rounded-control font-semibold text-calm">
        {task.avatar ? <Image src={task.avatar} alt="" width={40} height={40} unoptimized /> : task.name.slice(0, 1)}
      </span><span className="min-w-0 flex-1"><b className="block text-sm">{task.name}</b>
        <span className="mt-1 block truncate text-xs text-muted">{taskText(task, t)}</span></span><RowChevron />
    </button>
    <span className={`hidden min-w-24 shrink-0 justify-center rounded-full px-2.5 py-1 text-[11px] min-[760px]:inline-flex ${tagColor}`}>{t(taskTag(task.kind))}</span>
    <Button id={task.item ? `queue-${task.item.kind}-${task.item.id}` : undefined} disabled={pending} onClick={onAction} type="submit" variant={(first) ? 'primary' : 'secondary'} block={false} className={`min-h-12 shrink-0 px-3 text-xs font-semibold disabled:opacity-50 ${first ? "" : ""} `}>
      {t(`${task.kind}Action`)}</Button>
  </li>;
}
