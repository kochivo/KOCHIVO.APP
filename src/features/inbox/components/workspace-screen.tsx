'use client';
import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { LoadingState } from '@/ui/loading-state';
import { formatNumber } from '@/lib/format';
import { loadWorkspaceInbox, reviewAssessment } from '../data/workspace';
import { reviewItem } from '../data/inbox';
import { filterTasks, taskCounts, taskKey } from '../workspace-model';
import { sendWorkspaceReview } from '../workspace-send';
import type { TaskKind } from '../workspace-model';
import type { WorkspaceItem } from '../workspace-types';
import { workspaceMessages } from '../workspace-messages';
import { useDesktopDetail } from '../hooks/use-desktop-detail';
import { WorkspaceRow } from './workspace-row';
import { workspaceTriage, orderWorkspaceTasks } from '../workspace-triage';
import { messages } from '../messages';
import { FlagChip } from './flag-chip';
import { replyDraft, saveReplyDraft, clearReplyDraft } from '../workspace-drafts';
const Detail = dynamic(() => import('./workspace-detail').then(module => module.WorkspaceDetail), { loading: () => <LoadingState variant="detail" /> });

export function WorkspaceScreen({ joinRequests, tools }: { joinRequests: ReactNode; tools: ReactNode }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const triageT = useT(messages);
  const [limit, setLimit] = useState(50);
  const loader = useCallback(() => loadWorkspaceInbox(limit), [limit]);
  const resource = useResource(`captain-tasks-v6:${locale}:${limit}`, loader, { pollMs: 60000 });
  const [kind, setKind] = useState<TaskKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selection, setSelected] = useState<WorkspaceItem | null>();
  const desktop = useDesktopDetail();
  const [caughtUp, setCaughtUp] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [group, setGroup] = useState<'all' | 'attention' | 'routine'>('all');
  const guard = useRef<() => boolean>(() => true);
  const leave = () => { if (!guard.current()) return false; setSelected(null); setCaughtUp(false); return true; };
  const data = resource.data;
  const counts = data?.counts ?? taskCounts(data?.items ?? []);
  const resultFor = (item: WorkspaceItem) => data ? workspaceTriage(item, data.triage, new Date(data.at)) : { group: 'routine' as const, flags: [] };
  const filtered = filterTasks(data?.items ?? [], kind).filter(item => item.player_name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const visible = data ? orderWorkspaceTasks(filtered, data.triage, new Date(data.at), group) : [];
  const selected = selection === undefined && desktop ? visible[0] ?? null : selection ?? null;
  function setGuard(check: () => boolean) {
    guard.current = check;
    setSelected(current => current === undefined ? selected : current);
  }
  async function send(reply: string, advance: boolean) {
    if (!selected || selected.kind === 'request' || !data) return;
    const current = selected;
    setSelected(current);
    const next = await sendWorkspaceReview({ data, visible, current, reply, advance, now: new Date(),
      mutate: resource.mutate, failure: t('failed'), review: async (item, text) => {
        const result = item.kind === 'assessment' ? await reviewAssessment({ id: item.id, reply: text }) : await reviewItem({ kind: item.kind, id: item.id, reply: text });
        if (result.error) throw new Error(result.error);
      } });
    setSelected(next); setCaughtUp(advance && !next);
    setDrafts(value => clearReplyDraft(value, current));
  }
  return <section className="space-y-[18px]">
    <header className="flex flex-wrap items-center justify-between gap-3.5"><h1 id="tasks-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{t('title')}</h1></header>
    <div className="flex flex-wrap gap-2" aria-label={t('title')}>{(['all', 'checkin', 'assessment', 'request'] as const).map(value =>
      <button key={value} aria-pressed={kind === value} onClick={() => { if (leave()) setKind(value); }}
        className={`inline-flex min-h-12 items-center gap-2 rounded-full border border-line-soft px-4 text-sm ${kind === value ? 'bg-ink text-bg' : 'text-muted'}`}>
        {t(value)} <b className="font-display font-extrabold tabular-nums opacity-60">{formatNumber(counts[value], locale)}</b>
      </button>)}</div>
    {Boolean(resource.error) && <div role="alert" className="glass rounded-card p-5 text-danger">{t('loadFailed')}<button className="min-h-12 px-3" onClick={() => { void resource.retry(); }}>{t('retry')}</button></div>}
    {caughtUp && <p role="status" className="glass-strong rounded-card p-5">{t('caughtUp')}</p>}
    {!data ? !resource.error && <LoadingState variant="list" aria-label={t('loading')} /> : <>
      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="glass overflow-hidden rounded-card border border-line-soft">
          {!visible.length ? <p className="p-5 text-sm text-faint">{t('empty')}</p> : <ul className="divide-y divide-line-soft">{visible.map(item => <li key={taskKey(item)}>
            <WorkspaceRow item={item} inputs={data.triage} now={new Date(data.at)} selected={selected ? taskKey(selected) === taskKey(item) : false}
              onSelect={() => { if (leave()) setSelected(item); }} />
            {showTools && <div className="flex flex-wrap gap-2 px-[18px] pb-3">{resultFor(item).flags.map(flag => <FlagChip key={flag.key} flag={flag} />)}</div>}
          </li>)}</ul>}
        </div>
        {selected ? <Detail key={taskKey(selected)} item={selected} inputs={data.triage} now={new Date(data.at)} joinRequests={joinRequests}
          reply={replyDraft(drafts, selected)}
          onDraft={reply => setDrafts(value => saveReplyDraft(value, selected, reply))}
          onClose={() => { leave(); }} onSend={send} onDirty={setGuard} /> : <div className="glass hidden rounded-card border border-line-soft p-5 text-sm text-faint lg:block">{t('emptyDetail')}</div>}
      </div>
      {data.more && limit < 500 && <button className="min-h-12 rounded-full border border-line px-5" onClick={() => { if (leave()) setLimit(value => value + 50); }}>{t('older')}</button>}
    </>}
    <details className="glass rounded-card border border-line-soft p-5" onToggle={event => setShowTools(event.currentTarget.open)}>
      <summary className="min-h-12 cursor-pointer text-sm text-muted">{t('tools')}</summary>
      {showTools && <div className="space-y-5 pt-3"><input type="search" aria-label={t('search')} placeholder={t('search')} value={search}
        onChange={event => { if (leave()) setSearch(event.target.value); }} className="min-h-12 w-full rounded-full border border-line bg-transparent px-5" />
        <button aria-pressed={kind === 'form'} onClick={() => { if (leave()) setKind('form'); }} className="min-h-12 rounded-full border border-line px-4">{t('form')} <b className="ms-2 tabular-nums">{formatNumber(counts.form, locale)}</b></button>
        <div role="group" aria-label={triageT('triageFilter')} className="flex flex-wrap gap-2">{(['all', 'attention', 'routine'] as const).map(value =>
          <button key={value} aria-pressed={group === value} onClick={() => { if (leave()) setGroup(value); }} className={`min-h-12 rounded-full border border-line px-4 ${group === value ? 'text-lime' : 'text-muted'}`}>{triageT(value)}</button>)}</div>{tools}</div>}
    </details>
  </section>;
}
