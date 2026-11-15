import dynamic from 'next/dynamic';
import { Bell, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { KoHome, KoPlayers, KoTraining, KoFoods, KoForms, KoBilling, KoCaptainChat, KoPlus } from '@/ui/icons';
import { guidedMessages } from './messages';
import { CaptainHome } from './captain-home';
import { planIndex } from './state';
import type { Page } from './steps';
import type { PaneProps } from './types';
import type { DemoPlan } from './types';
import { LazyState } from './lazy-state';
import { ViewBoundary } from './view-boundary';

const Views = dynamic(() => import('./captain-views').then(m => m.CaptainViews), { loading: () => <LazyState /> });
const nav = [ ['home', KoHome], ['inbox', KoCaptainChat], ['players', KoPlayers], ['programs', KoTraining], ['food', KoFoods], ['assess', KoForms], ['money', KoBilling] ] as const;
export function CaptainPane(props: PaneProps & { plans: readonly DemoPlan[] }) {
  const { state, dispatch, now } = props, t = useT(guidedMessages);
  const go = (page: Page) => dispatch({ type: 'go', page, now: now() });
  const needed = [!state.approved, !state.nudged, !state.renewed, !state.paid].filter(Boolean).length;
  return <section className="demo-captain-column min-w-0" aria-label={t('captain')}>
    <p className="demo-pane-caption mb-stack text-xs text-muted"><b>{t('captainPane')}</b> · {t('captainCaption', { n: state.n })}</p>
    <div className="demo-captain overflow-hidden rounded-card border border-line bg-bg" data-area="captain">
      <aside className="demo-captain-side glass flex gap-stack p-stack">
        {nav.map(([page, Icon]) => {
          const active = state.page === page || page === 'players' && state.page === 'player';
          const count = page === 'home' ? needed : page === 'inbox' ? 2 + state.unread : page === 'assess' && !state.approved ? 1 : 0;
          return <Button key={page} variant="ghost" className="demo-sidebar-item shrink-0 justify-start" aria-current={active ? 'page' : undefined} onClick={() => go(page)}>
            <Icon className="size-5 shrink-0" active={active} />{t(page)}
            {count > 0 && <b className={`ms-auto rounded-full px-inline text-micro ${page === 'home' ? 'bg-lime text-on-lime' : 'bg-surface-raised'}`}>{count}</b>}
          </Button>;
        })}
        <div className="demo-captain-card mt-auto rounded-control bg-surface p-stack"><b className="text-sm">{t('captainName')}</b><p className="text-xs text-muted">{props.plans[planIndex(state.n)]?.name} · {t('playersCount', { n: state.n })}</p></div>
      </aside>
      <div className="demo-captain-main grid min-w-0 content-start gap-card-gap p-card">
        <header className="demo-captain-bar glass flex items-center justify-between gap-inline rounded-card p-stack">
          <div className="min-w-0 flex-1"><h2 className="truncate text-title font-semibold">{state.page === 'home' ? t('greeting') : state.page === 'player' ? t('names').split('|')[0] : t(state.page)}</h2><p className="truncate text-xs text-muted">{state.page === 'players' ? t('playersCount', { n: state.n + state.invites.length }) : t('date')}</p></div>
          <Button variant="secondary" className="demo-search" onClick={() => go('players')}><Search aria-hidden className="size-4" />{t('search')}</Button>
          <IconButton aria-label={t('needs')} onClick={() => go('home')}><Bell aria-hidden className="size-5" /></IconButton>
          <Button block={false} onClick={() => go('add')}><KoPlus className="size-5" />{t('add')}</Button>
        </header>
        {state.page === 'home' ? <CaptainHome {...props} /> : <ViewBoundary message={t('error')} retryLabel={t('retry')}><Views {...props} /></ViewBoundary>}
      </div>
    </div>
  </section>;
}
