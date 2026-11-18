'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { ageLabel } from '@/features/inbox';
import type { InboxItem, TriageInputs } from '@/features/inbox';
import type { VoiceInput } from '@/features/chat';
import { Button, buttonClass, clickableClass } from '@/ui/button';
import { formatDateAr } from '@/lib/dates';
import type { CaptainTask } from './tasks-model';
import { taskMessages } from './messages';
import { taskText, taskTag } from './task-copy';
import { phoneTaskMessages } from './phone/messages';
import { PhoneTaskFacts } from './phone-task-facts';

const Media = dynamic(() => import('./task-media').then(module => module.TaskMedia));
const Compose = dynamic(() => import('./task-compose').then(module => module.TaskCompose));

export function PhoneTaskCard({ task, at, triage, pending, canMove, onNext, onAction, onReview, onSend }: {
  task: CaptainTask; at: string; triage: TriageInputs; pending: boolean; canMove: boolean;
  onNext: () => void; onAction: () => void; onReview: (item: InboxItem) => void;
  onSend: (body: string, voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds' | 'id'>) => Promise<boolean>;
}) {
  const t = useT(phoneTaskMessages), copy = useT(taskMessages), locale = useLocale();
  const item = task.item, now = new Date(at);
  const time = task.kind === 'renew' ? formatDateAr(task.at, { day: 'numeric', month: 'long' }, locale) : ageLabel(task.at, now, locale);
  const description = item?.kind === 'checkin' ? item.notes : item?.kind === 'form' ? item.note : taskText(task, copy);
  return <article className="glass flex min-h-[calc(100dvh-var(--nav-clearance)-12rem)] min-w-0 flex-col gap-card-gap rounded-card p-card">
    <header className="flex min-w-0 items-center gap-stack">
      <Link href={`/${locale}/captain/players/${task.playerId}`} aria-label={`${t('profile')} · ${task.name}`}
        className={`${clickableClass} glass grid size-13 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-lime text-title font-bold`}>
        {task.avatar ? <Image src={task.avatar} alt="" width={52} height={52} unoptimized /> : task.name.slice(0, 1)}
      </Link>
      <div className="min-w-0 flex-1"><h2 className="break-words text-md font-bold">{task.name}</h2>
        <p className="text-xs text-muted">{item?.kind === 'form' ? item.exercise_name : copy(taskTag(task.kind))}
          {' · '}{time}</p></div>
      {item && <span className="tone-lime rounded-md px-inline text-micro font-semibold">{copy(taskTag(task.kind))}</span>}
    </header>
    {item?.kind === 'checkin' && <PhoneTaskFacts item={item} triage={triage} now={now} />}
    {item && <Media item={item} phone />}
    {description && <p className="whitespace-pre-wrap break-words text-row text-muted">{description}</p>}
    <div className="mt-auto flex gap-inline">
      <Button variant="secondary" size="lg" block={false} disabled={pending || !canMove} onClick={onNext}>{t('later')}</Button>
      {task.href ? <Link href={`/${locale}${task.href}`} className={buttonClass({ size: 'lg', block: false, className: 'min-w-0 flex-1' })}>
        {copy(`${task.kind}Action`)}</Link> :
        <Button id={item ? `phone-queue-${item.kind}-${item.id}` : undefined} size="lg" block={false} className="min-w-0 flex-1"
          disabled={pending} onClick={() => item ? onReview(item) : onAction()}>{item ? t('approveReply') : copy(`${task.kind}Action`)}</Button>}
    </div>
    {!task.href && task.kind !== 'receipt' && <details>
      <summary className={`${clickableClass} min-h-12 content-center text-sm text-muted`}>{t('reply')}</summary>
      <Compose disabled={pending} onSend={onSend} />
    </details>}
  </article>;
}
