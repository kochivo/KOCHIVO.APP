'use client';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { useT, useLocale } from '@/core/i18n/client';
import { taskMessages } from './messages';
import { taskText, taskTag } from './task-copy';
import type { CaptainTask } from './tasks-model';
import type { VoiceInput } from '@/features/chat';
import { Button, buttonClass } from '@/ui/button';
const Media = dynamic(() => import('./task-media').then(module => module.TaskMedia));
const Compose = dynamic(() => import('./task-compose').then(module => module.TaskCompose));
export function TaskDetail({ task, pending, onBack, onSend }: { task: CaptainTask; pending: boolean; onBack: () => void;
  onSend: (body: string, voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds' | 'id'>) => Promise<boolean> }) {
  const t = useT(taskMessages), locale = useLocale();
  return <section className="glass min-w-0 rounded-card p-card">
    <Button onClick={onBack} type="submit" variant={'secondary'} block={false} className={"mb-stack flex min-h-12 items-center gap-inline px-stack text-xs min-[760px]:hidden"}><ArrowRight aria-hidden className="dir-icon size-4" />{t('back')}</Button>
    <header className="mb-card-gap flex items-center gap-stack">
      <span aria-hidden className="glass grid size-10 shrink-0 place-items-center overflow-hidden rounded-control text-calm">
        {task.avatar ? <Image src={task.avatar} alt="" width={40} height={40} unoptimized /> : task.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{task.name}</h2><p className="mt-inline text-xs text-muted">{t(taskTag(task.kind))}</p></div>
      <Link href={`/${locale}/captain/players/${task.playerId}`} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-stack text-xs" })}>{t('profile')}</Link>
    </header>
    {task.item && <Media key={task.id} item={task.item} />}
    <p className="my-stack whitespace-pre-wrap text-sm leading-8 text-muted">{taskText(task, t)}</p>
    {task.href ? <Link href={`/${locale}${task.href}`} className={buttonClass({ variant: 'secondary', block: false })}>{t(`${task.kind}Action`)}</Link>
      : task.kind === 'receipt' ? <Link href={`/${locale}/captain/billing#receipt-${task.id.slice('receipt:'.length)}`}
      className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x text-sm" })}>{t('receiptAction')}</Link>
      : <Compose key={task.id} disabled={pending} onSend={onSend} />}
  </section>;
}
