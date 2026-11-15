'use client';
import { clickableClass, Button, buttonClass } from '@/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { RowChevron } from '@/ui/row-chevron';
import { useLocale, useT } from '@/core/i18n/client';
import { taskMessages } from './messages';
import { taskText, taskTag } from './task-copy';
import type { CaptainTask } from './tasks-model';

export function TaskRow({ task, selected, first, pending, onSelect, onAction }: {
  task: CaptainTask; selected: boolean; first: boolean; pending: boolean; onSelect: () => void; onAction: () => void;
}) {
  const t = useT(taskMessages);
  const locale = useLocale();
  const content = <>
    <span className="glass grid size-10 shrink-0 place-items-center overflow-hidden rounded-control font-semibold text-calm">
      {task.avatar ? <Image src={task.avatar} alt="" width={40} height={40} unoptimized /> : task.name.slice(0, 1)}
    </span><span className="min-w-0 flex-1"><b className="block text-sm">{task.name}</b>
      <span className="mt-inline block truncate text-xs text-muted">{taskText(task, t)}</span></span><RowChevron />
  </>;
  const clickableClassRow = `${clickableClass} flex min-h-12 min-w-0 flex-1 items-center gap-stack text-start`;
  const tagColor = task.kind === 'video' || task.kind === 'absent' ? 'bg-warn-soft text-warn'
    : task.kind === 'renew' || task.kind === 'program' || task.kind === 'nutrition' ? 'bg-calm/10 text-calm' : 'bg-surface-raised text-muted';
  return <li className={`flex items-center gap-stack rounded-control border-line-soft p-stack [&+li]:border-t ${selected ? 'bg-surface-raised' : ''}`}>
    {task.href ? <Link href={`/${locale}${task.href}`} className={clickableClassRow}>{content}</Link>
      : <button aria-pressed={selected} onClick={onSelect} className={clickableClassRow}>{content}</button>}
    <span className={`hidden min-w-24 shrink-0 justify-center rounded-full px-stack py-inline text-micro min-[760px]:inline-flex ${tagColor}`}>{t(taskTag(task.kind))}</span>
    {task.href ? <Link href={`/${locale}${task.href}`} className={buttonClass({ variant: first ? 'primary' : 'secondary', block: false,
      className: 'min-h-12 shrink-0 px-stack text-xs font-semibold' })}>{t(`${task.kind}Action`)}</Link>
      : <Button id={task.item ? `queue-${task.item.kind}-${task.item.id}` : undefined} disabled={pending} onClick={onAction} type="submit" variant={(first) ? 'primary' : 'secondary'} block={false} className={`min-h-12 shrink-0 px-stack text-xs font-semibold disabled:opacity-50 ${first ? "" : ""} `}>
        {t(`${task.kind}Action`)}</Button>}
  </li>;
}
