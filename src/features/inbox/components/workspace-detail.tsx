'use client';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
import { WorkspaceFlags } from './workspace-flags';
import { WorkspaceKpis } from './workspace-kpis';
import { useDesktopDetail } from '../hooks/use-desktop-detail';

export function WorkspaceDetail({ item, inputs, now, reply, onDraft, onClose, onSend, onDirty, joinRequest, blocked }: {
  item: WorkspaceItem; inputs: TriageInputs; now: Date; joinRequest: ReactNode; blocked: boolean;
  reply: string; onDraft: (reply: string) => void;
  onClose: () => void; onSend: (reply: string, advance: boolean) => Promise<void>; onDirty: (guard: () => boolean) => void;
}) {
  const t = useT(workspaceMessages), locale = useLocale(), timezone = useTimezone();
  const desktop = useDesktopDetail();
  const router = useRouter();
  return <ResponsiveDialog openerId={`task-${taskKey(item)}`} fallbackId="tasks-heading" onDismiss={onClose}
    aria-label={item.player_name} style={{ maxBlockSize: desktop ? 'none' : 'var(--visible-viewport-height, 100dvh)', paddingBlock: 0, paddingInline: 0 }}
    className="sheet fixed inset-0 z-50 m-0 h-full max-h-dvh w-full min-w-0 max-w-none overflow-y-auto bg-bg p-0 text-ink backdrop:bg-bg/80 lg:glass lg:static lg:z-auto lg:h-auto lg:max-h-none lg:rounded-card lg:border lg:border-line-soft">
    <header className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-[18px]">
      <IconButton aria-label={t('back')} onClick={onClose} className="grid min-h-12 min-w-12 place-items-center lg:hidden"><ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" aria-hidden /></IconButton>
      <span aria-hidden className="glass grid size-[38px] shrink-0 place-items-center rounded-full border border-line">{item.player_name.slice(0, 1)}</span>
      <div className="min-w-0 flex-1"><h2 className="font-display text-[19px] font-semibold">{item.player_name}</h2>
        <p className="mt-1 text-xs text-faint">{item.kind === 'checkin' ? t('weekly') : t(item.kind)} · {t('sent', { date: formatTimestampAr(item.created_at, { weekday: 'long', hour: 'numeric', minute: '2-digit' }, locale, timezone) })}</p></div>
      {item.kind !== 'request' && <Link className="inline-flex min-h-12 items-center rounded-full border border-line px-3.5 text-[12.5px]" href={`/captain/players/${item.player_id}`}>{t('openPlayer')}</Link>}
    </header>
    {item.kind === 'request' ? <div className="p-5" onKeyDown={event => {
      if (event.key === 'Escape' && event.target instanceof Element && event.target.closest('dialog') !== event.currentTarget.closest('dialog')) event.stopPropagation();
    }}>{joinRequest ?? <div role="alert">{t('loadFailed')}<Button variant="secondary" className="min-h-12 px-3" onClick={() => router.refresh()}>{t('retry')}</Button></div>}</div> : <>
      <WorkspaceFlags item={item} inputs={inputs} now={now} />
      {item.kind === 'checkin' ? <WorkspaceCheckin item={item} inputs={inputs} now={now} /> : <><WorkspaceKpis item={item} inputs={inputs} />
        <div className="px-5 pb-3.5">{item.kind === 'assessment' ? <WorkspaceAssessment item={item} /> : <FormCheckDetail item={item} />}</div></>}
      {item.reviewed_at ? <div className="border-t border-line-soft p-5"><p className="text-muted">{t('reviewed')}</p><p className="whitespace-pre-wrap">{item.reply || t('noReply')}</p></div> : <WorkspaceReply item={item} reply={reply} blocked={blocked} onDraft={onDraft} onSend={onSend} onDirty={onDirty} />}
    </>}
  </ResponsiveDialog>;
}
