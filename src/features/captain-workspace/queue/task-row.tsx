'use client';
import { clickableClass, Button, buttonClass } from '@/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { RowChevron } from '@/ui/row-chevron';
import { useLocale, useT } from '@/core/i18n/client';
import { taskMessages } from './messages';
import { taskText, taskTag } from './task-copy';
import type { CaptainTask, TaskKind } from './tasks-model';

const tagTones: Record<TaskKind, string> = {
  video: 'tone-info', absent: 'tone-danger', checkin: 'tone-lime', swap: 'tone-info',
  renew: 'tone-warn', program: 'tone-lime', nutrition: 'tone-info', receipt: 'tone-warn',
};

export function TaskRow({ task, selected, first = false, pending, onSelect, onAction }: {
  task: CaptainTask; selected: boolean; first?: boolean; pending: boolean; onSelect: () => void; onAction: () => void;
}) {
  const t = useT(taskMessages);
  const locale = useLocale();
  const content = <>
    <span className="glass grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line font-semibold">
      {task.avatar ? <Image src={task.avatar} alt="" width={40} height={40} unoptimized /> : task.name.slice(0, 1)}
    </span><span className="min-w-0 flex-1"><b className="block text-sm">{task.name}</b>
      <span className="mt-inline block truncate text-xs text-muted">{taskText(task, t)}</span></span><RowChevron />
  </>;
  const clickableClassRow = `${clickableClass} flex min-h-12 min-w-0 flex-1 items-center gap-stack text-start`;
  return <li className={`flex min-h-[58px] flex-wrap items-center gap-inline border-t border-line-soft px-card ${selected ? 'bg-surface-raised' : ''}`}>
    {task.href ? <Link href={`/${locale}${task.href}`} className={clickableClassRow}>{content}</Link>
      : <button aria-pressed={selected} onClick={onSelect} className={clickableClassRow}>{content}</button>}
    <span className={`shrink-0 rounded-md px-inline text-micro font-semibold ${tagTones[task.kind]}`}>{t(taskTag(task.kind))}</span>
    {task.href ? <Link href={`/${locale}${task.href}`} className={buttonClass({ variant: first ? 'primary' : 'secondary', block: false,
      className: 'min-h-12 shrink-0 px-stack text-xs font-semibold' })}>{t(`${task.kind}Action`)}</Link>
      : <Button id={task.item ? `queue-${task.item.kind}-${task.item.id}` : undefined} disabled={pending} onClick={onAction} type="submit" variant={first ? "primary" : "secondary"} block={false} className={"min-h-12 shrink-0 px-stack text-xs font-semibold disabled:opacity-50"}>
        {t(`${task.kind}Action`)}</Button>}
  </li>;
}
