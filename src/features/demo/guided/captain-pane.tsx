import dynamic from 'next/dynamic';
import { useState } from 'react';
/* eslint-disable no-restricted-imports -- T-288 requires the shared navigation view leaf. */
import { CaptainFrameNavView } from '@/features/roster/components/captain-frame-nav-view';
import { CaptainNavGroups } from '@/features/roster/components/captain-nav-groups';
import type { FrameId } from '@/features/roster/components/captain-frame-model';
import { frameMessages } from '@/features/roster/components/captain-frame-messages';
/* eslint-enable no-restricted-imports */
import { Bell, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { KoPlus } from '@/ui/icons';
import { guidedMessages } from './messages';
import { CaptainHome } from './captain-home';
import { planIndex } from './state';
import type { Page } from './steps';
import type { PaneProps } from './types';
import type { DemoPlan } from './types';
import { LazyState } from './lazy-state';
import { ViewBoundary } from './view-boundary';

const Views = dynamic(() => import('./captain-views').then(m => m.CaptainViews), { loading: () => <LazyState /> });
const destinations: Partial<Record<FrameId, Page>> = { home: 'home', tasks: 'tasks', inbox: 'inbox', players: 'players', programs: 'programs', plans: 'food', forms: 'assess', billing: 'money', join: 'join' };
const available = Object.keys(destinations) as FrameId[];
export function CaptainPane(props: PaneProps & { plans: readonly DemoPlan[] }) {
  const { state, dispatch, now } = props, t = useT(guidedMessages), frame = useT(frameMessages);
  const [more, setMore] = useState(false);
  const go = (page: Page) => dispatch({ type: 'go', page, now: now() });
  const needed = [!state.approved, !state.nudged, !state.renewed].filter(Boolean).length;
  const active = (Object.entries(destinations).find(([, page]) => page === (state.page === 'player' ? 'players' : state.page))?.[0] ?? 'home') as FrameId;
  const counts = { tasks: needed, inbox: 2 + state.unread, join: state.joined ? 0 : 1, billing: state.paid ? 0 : 1 };
  const select = (id: FrameId) => { const page = destinations[id]; if (page) { go(page); setMore(false); } };
  return <section className="demo-captain-column min-w-0" aria-label={t('captain')}>
    <p className="demo-pane-caption mb-stack text-xs text-muted"><b>{t('captainPane')}</b> · {t('captainCaption', { n: state.n })}</p>
    <div className="demo-captain overflow-hidden rounded-card border border-line bg-bg" data-area="captain">
      <aside className="demo-captain-side glass flex flex-col gap-stack p-stack">
        <CaptainFrameNavView available={available} active={active} counts={counts} open={more} onMore={() => setMore(true)} onClose={() => setMore(false)} onSelect={select}
          more={more && <div className="demo-more sheet rounded-card p-card"><Button variant="secondary" onClick={() => setMore(false)}>{frame('close')}</Button><CaptainNavGroups available={available} active={active} counts={counts} tiles onSelect={select} /></div>} />
        <div className="demo-captain-card mt-auto rounded-control bg-surface p-stack"><b className="text-sm">{t('captainName')}</b><p className="text-xs text-muted">{props.plans[planIndex(state.n)]?.name} · {t('playersCount', { n: state.n })}</p></div>
      </aside>
      <div className="demo-captain-main grid min-w-0 content-start gap-card-gap p-card">
        <header className="demo-captain-bar glass flex items-center justify-between gap-inline rounded-card p-stack">
          <div className="min-w-0 flex-1"><h2 className="truncate text-title font-semibold">{state.page === 'home' ? t('greeting') : state.page === 'player' ? t('names').split('|')[0] : state.page === 'tasks' ? frame('tasks') : state.page === 'join' ? frame('join') : state.page === 'inbox' ? frame('mobileInbox') : t(state.page)}</h2><p className="truncate text-xs text-muted">{state.page === 'players' ? t('playersCount', { n: state.n + state.invites.length }) : t('date')}</p></div>
          <Button variant="secondary" className="demo-search" onClick={() => go('players')}><Search aria-hidden className="size-4" />{t('search')}</Button>
          <IconButton aria-label={t('needs')} onClick={() => go('home')}><Bell aria-hidden className="size-5" /></IconButton>
          <Button block={false} onClick={() => go('add')}><KoPlus className="size-5" />{t('add')}</Button>
        </header>
        {state.page === 'home' ? <CaptainHome {...props} /> : <ViewBoundary message={t('error')} retryLabel={t('retry')}><Views {...props} /></ViewBoundary>}
      </div>
    </div>
  </section>;
}
