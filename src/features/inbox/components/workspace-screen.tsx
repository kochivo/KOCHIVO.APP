'use client';
import { Button } from '@/ui/button';
import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useResource } from '@/core/resource';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { LoadingState } from '@/ui/loading-state';
import { formatNumber } from '@/lib/format';
import { loadWorkspaceInbox, loadWorkspaceReviews, reviewAssessment } from '../data/workspace';
import { reviewItem } from '../data/inbox';
import { taskCounts, taskKey } from '../workspace-model';
import { followupMetrics, followupView } from '../workspace-followup';
import type { FollowupStatus } from '../workspace-followup';
import { followupAge } from '../workspace-age';
import { sendWorkspaceReview } from '../workspace-send';
import type { TaskKind } from '../workspace-model';
import type { WorkspaceItem, ReviewCursor } from '../workspace-types';
import { workspaceMessages } from '../workspace-messages';
import { useDesktopDetail } from '../hooks/use-desktop-detail';
import { replyDraft, saveReplyDraft, clearReplyDraft } from '../workspace-drafts';
import { WorkspaceControls } from './workspace-controls';
import { WorkspaceEmpty } from './workspace-empty';
import { WorkspaceList } from './workspace-list';
import { WorkspaceRow } from './workspace-row';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
const Detail = dynamic(() => import('./workspace-detail').then(module => module.WorkspaceDetail), { loading: () => <LoadingState variant="detail" /> });

export function WorkspaceScreen({ joinRequests }: { joinRequests: Record<string, ReactNode> }) {
  const t = useT(workspaceMessages), locale = useLocale(), style = useArabicStyle();
  const success = useT(successMessages), toast = useToast();
  const [limit, setLimit] = useState(50);
  const loader = useCallback(() => loadWorkspaceInbox(limit), [limit]);
  const resource = useResource(`captain-followup-v6:${locale}:${limit}`, loader, { pollMs: 60000 });
  const [kind, setKind] = useState<TaskKind | 'all'>('all');
  const [status, setStatus] = useState<FollowupStatus>('waiting');
  const [search, setSearch] = useState('');
  const [selection, setSelected] = useState<WorkspaceItem | null>();
  const [requestNodes, setRequestNodes] = useState(joinRequests);
  const desktop = useDesktopDetail();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [historyPending, setHistoryPending] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyPage, setHistoryPage] = useState<{ items: WorkspaceItem[]; cursor: ReviewCursor | null; more: boolean } | null>(null);
  const historyLock = useRef(false);
  const sendLock = useRef(false);
  const guard = useRef<() => boolean>(() => true);
  const setGuard = useCallback((check: () => boolean) => { guard.current = check; }, []);
  const leave = () => {
    if (sendLock.current || !guard.current()) return false;
    if (selected?.kind === 'request') void resource.retry();
    setSelected(null); return true;
  };
  const data = resource.data;
  const allItems = [...new Map([...(historyPage?.items ?? []), ...(data?.items ?? [])].map(item => [taskKey(item), item])).values()];
  const now = new Date(data?.at ?? '2026-01-01T00:00:00Z');
  const listItems = allItems.filter(item => !item.reviewed_at || !data?.weekAt || item.reviewed_at >= data.weekAt);
  const view = followupView(listItems, data?.triage ?? { history: [], dailyChecks: [] }, now, { kind, status, search });
  const counts = !search.trim() && data?.counts && data.statusCounts ? { waiting: data.counts[kind],
    overdue: data.statusCounts.overdue[kind], completed: data.statusCounts.completed[kind] } : view.counts;
  const selected = selection === undefined && desktop ? view.visible[0] ?? null : selection ?? null;
  const metrics = followupMetrics(allItems, now, data?.weekAt ?? '');
  const weekCount = data?.reviews?.total ?? metrics.reviewedWeek;
  const hours = weekCount === metrics.reviewedWeek ? metrics.replyHours : null;
  const waiting = data?.counts?.all ?? taskCounts(data?.items ?? []).all;
  const oldest = data?.oldest ?? metrics.oldest;
  const summary = data && waiting ? t('summary', { n: formatNumber(waiting, locale) })
    + (oldest ? t('oldest', { age: followupAge(oldest, now, locale, style) }) : '')
    + (hours === null ? '' : t('average', { h: formatNumber(Math.round(hours * 10) / 10, locale) })) : '';
  const caughtUp = data && !waiting && !data.more && status === 'waiting' && kind === 'all' && !search.trim();
  async function send(reply: string, advance: boolean) {
    if (!selected || selected.kind === 'request' || !data) return;
    if (historyLock.current || sendLock.current) throw new Error(t('historyBusy'));
    sendLock.current = true;
    try {
      const current = selected;
      setSelected(current);
      const next = await sendWorkspaceReview({ data, visible: view.visible, current, reply, advance, now: new Date(),
        mutate: resource.mutate, failure: t('failed'), review: async (item, text) => {
          const result = item.kind === 'assessment' ? await reviewAssessment({ id: item.id, reply: text }) : await reviewItem({ kind: item.kind, id: item.id, reply: text });
          if (result.error) throw new Error(result.error);
        } });
      setSelected(next);
      setDrafts(value => clearReplyDraft(value, current));
      toast.success({ title: success('replySent', { name: current.player_name }), detail: success('name', { name: current.kind === 'assessment' ? current.title : current.kind === 'form' ? current.exercise_name : t('checkin') }), icon: 'form' });
      void resource.retry();
    } finally { sendLock.current = false; }
  }
  async function moreHistory() {
    const cursor = historyPage ? historyPage.cursor : data?.reviews?.cursor;
    if (!data || !cursor || historyLock.current || sendLock.current || !guard.current()) return;
    historyLock.current = true; setHistoryPending(true); setHistoryError(false);
    try {
      const page = await loadWorkspaceReviews({ at: data.at, cursor });
      setHistoryPage(value => ({ items: [...new Map([...(value?.items ?? []), ...page.items].map(item => [taskKey(item), item])).values()],
        more: page.more, cursor: page.cursor }));
    } catch { setHistoryError(true); }
    finally { historyLock.current = false; setHistoryPending(false); }
  }
  const reviews = allItems.filter(item => item.reviewed_at).sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''));
  return <section className="space-y-card-gap">
    <WorkspaceControls summary={summary} counts={counts} kind={kind} status={status} search={search}
      onKind={value => { if (leave()) setKind(value); }} onStatus={value => { if (leave()) setStatus(value); }} onSearch={value => { if (leave()) setSearch(value); }} />
    {search.trim() && (data?.more || weekCount > metrics.reviewedWeek) && <p className="text-xs text-faint">{t('searchPartial')}</p>}
    {Boolean(resource.error) && <div role="alert" className="glass rounded-card p-card text-danger">{t('loadFailed')}<Button variant="secondary" className="min-h-12 px-stack" onClick={() => { if (!sendLock.current && !historyLock.current && guard.current()) void resource.retry(); }}>{t('retry')}</Button></div>}
    {!data ? !resource.error && <LoadingState variant="list" aria-label={t('loading')} /> : <>
      {caughtUp && !selected ? <WorkspaceEmpty count={weekCount} hours={hours} /> : <div className="grid items-start gap-card-gap lg:grid-cols-[360px_minmax(0,1fr)]">
        <WorkspaceList attention={view.attention} routine={view.routine} selected={selected} inputs={data.triage} now={now}
          onReset={kind !== 'all' || status !== 'waiting' || search.trim() ? () => {
            if (leave()) {
              setKind('all'); setStatus('waiting'); setSearch('');
              document.getElementById('tasks-heading')?.focus();
            }
          } : undefined}
          onSelect={item => { if (leave()) { setRequestNodes(value => ({ ...value, ...joinRequests })); setSelected(item); } }} />
        {selected ? <Detail key={taskKey(selected)} item={selected} inputs={data.triage} now={now} joinRequest={requestNodes[selected.id] ?? joinRequests[selected.id]} blocked={historyPending}
            reply={replyDraft(drafts, selected)} onDraft={reply => setDrafts(value => saveReplyDraft(value, selected, reply))}
            onClose={() => { leave(); }} onSend={send} onDirty={setGuard} />
          : <div className="glass hidden rounded-card border border-line-soft p-card text-sm text-faint lg:block">{t('emptyDetail')}</div>}
      </div>}
      {data.more && limit < 500 && <div className="text-sm text-faint"><p>{t('partial')}</p><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => { if (leave()) setLimit(value => value + 50); }}>{t('older')}</Button></div>}
      <details className="glass rounded-card border border-line-soft px-page-x py-inline">
        <summary className="min-h-12 cursor-pointer content-center text-sm text-faint">{t('history')} {t('historyWeek', { n: formatNumber(weekCount, locale) })}</summary>
        {!reviews.length ? <p className="py-stack text-sm text-faint">{t('historyEmpty')}</p> : <ul className="divide-y divide-line-soft">{reviews.map(item => <li key={taskKey(item)}>
          <WorkspaceRow item={item} inputs={data.triage} now={now} selected={false} idPrefix="history-task" onSelect={() => { if (leave()) setSelected(item); }} />
        </li>)}</ul>}
        {historyError && <p role="alert" className="text-danger">{t('loadFailed')}</p>}
        {(historyPage?.more ?? data.reviews?.more) && <Button disabled={historyPending} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-page-x disabled:opacity-50"} onClick={() => { void moreHistory(); }}>{t(historyPending ? 'loading' : historyError ? 'retry' : 'older')}</Button>}
      </details>
    </>}
  </section>;
}
