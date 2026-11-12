'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { formatTimestampAr } from '@/lib/dates';
import type { WorkspaceItem } from '../workspace-types';
import type { TriageInputs } from '../triage';
import { taskKey } from '../workspace-model';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceCheckin } from './workspace-checkin';
import { WorkspaceAssessment } from './workspace-assessment';
import { FormCheckDetail } from './form-check-detail';
import { WorkspaceReply } from './workspace-reply';

export function WorkspaceDetail({ item, inputs, now, joinRequests, reply, onDraft, onClose, onSend, onDirty }: {
  item: WorkspaceItem; inputs: TriageInputs; now: Date; joinRequests: ReactNode;
  reply: string; onDraft: (reply: string) => void;
  onClose: () => void; onSend: (reply: string, advance: boolean) => Promise<void>; onDirty: (guard: () => boolean) => void;
}) {
  const t = useT(workspaceMessages), locale = useLocale(), timezone = useTimezone();
  return <ResponsiveDialog openerId={`task-${taskKey(item)}`} fallbackId="tasks-heading" onDismiss={onClose}
    aria-label={item.player_name} style={{ maxBlockSize: '100dvh' }} className="sheet fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none space-y-3.5 overflow-y-auto bg-bg p-5 text-ink backdrop:bg-bg/80 lg:static lg:z-auto lg:h-auto lg:rounded-card lg:border lg:border-line-soft lg:bg-surface lg:p-5">
    <header className="flex flex-wrap items-center gap-3">
      <button aria-label={t('back')} onClick={onClose} className="grid min-h-12 min-w-12 place-items-center lg:hidden"><ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" aria-hidden /></button>
      <span aria-hidden className="glass grid size-[38px] shrink-0 place-items-center rounded-full border border-line">{item.player_name.slice(0, 1)}</span>
      <div className="min-w-0 flex-1"><h2 className="font-display text-[19px] font-semibold">{item.player_name}</h2>
        <p className="mt-1 text-xs text-faint">{t('sent', { date: formatTimestampAr(item.created_at, { weekday: 'long', hour: 'numeric', minute: '2-digit' }, locale, timezone) })}</p></div>
      {item.kind !== 'request' && <Link className="inline-flex min-h-12 items-center rounded-full border border-line px-3.5 text-[12.5px]" href={`/captain/players/${item.player_id}`}>{t('openPlayer')}</Link>}
    </header>
    {item.kind === 'request' ? joinRequests : <>
      {item.kind === 'checkin' ? <WorkspaceCheckin item={item} inputs={inputs} now={now} /> : item.kind === 'assessment' ? <WorkspaceAssessment item={item} /> : <FormCheckDetail item={item} />}
      {item.reviewed_at ? <div className="glass rounded-card p-4"><p className="text-muted">{t('reviewed')}</p><p className="whitespace-pre-wrap">{item.reply || t('noReply')}</p></div> : <WorkspaceReply item={item} reply={reply} onDraft={onDraft} onSend={onSend} onDirty={onDirty} />}
    </>}
  </ResponsiveDialog>;
}
