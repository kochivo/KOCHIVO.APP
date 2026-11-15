import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 explicitly requires server-safe view leaf imports. */
import { HomeHeroView } from '@/features/dashboard/home/home-hero-view';
import { HomeTilesView } from '@/features/dashboard/home/home-tiles-view';
import { HomeTaskListView } from '@/features/dashboard/home/home-task-list-view';
import { homeMessages, homeV11Messages } from '@/features/dashboard/home/messages';
import type { HomeTask } from '@/features/dashboard/home/tasks';
import { MoneyOwedView } from '@/features/captain-workspace/money-owed/money-owed-view';
import { messages as moneyMessages } from '@/features/captain-workspace/money-owed/messages';
/* eslint-enable no-restricted-imports */
import { GlassCard } from '@/ui/glass-card';
import { guidedMessages } from './messages';
import { scaled } from './state';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';
import { toastKeys } from './toast-keys';
import { demoMoney } from './money-data';

export function CaptainHome({ state, dispatch, act, now }: PaneProps) {
  const t = useT(guidedMessages), home = useT(homeV11Messages), old = useT(homeMessages);
  const names = t('names').split('|'), { trained } = scaled(state.n), locale = useLocale(), money = useT(moneyMessages);
  const go = (page: 'tasks' | 'assess' | 'money') => dispatch({ type: 'go', page, now: now() });
  const tasks: HomeTask[] = [
    ...(!state.approved ? [{ id: 'review', playerId: 'sara', name: names[1] ?? '', kind: 'assessment' as const, href: '/captain/tasks', urgent: true }] : []),
    ...(!state.nudged ? [{ id: 'nudge', playerId: 'omar', name: names[2] ?? '', kind: 'absent' as const, href: '/captain/tasks', days: 4, urgent: false }] : []),
    ...(!state.renewed ? [{ id: 'renew', playerId: 'ali', name: names[3] ?? '', kind: 'renew' as const, href: '/captain/billing', urgent: false }] : []),
    ...(!state.paid ? [{ id: 'pay', playerId: 'mohamed', name: names[0] ?? '', kind: 'dues' as const, href: '/captain/billing', urgent: false }] : []),
  ];
  const select = (href: string) => {
    if (href === 'nudge' || href === 'renew') act(href);
    else go(href === 'review' ? 'assess' : href === 'pay' || href.includes('billing') ? 'money' : 'tasks');
  };
  return <div className="@container/demo-home grid auto-rows-max grid-cols-1 gap-card-gap">
    <HomeHeroView t={home} locale={locale} tasks={tasks} count={tasks.length} completed={4 - tasks.length} onSelect={select} />
    <div data-demo-target="kpis"><HomeTilesView responsiveTo="container" t={home} old={old} locale={locale} adherence={78} previous={72}
      trained={trained} active={state.n} pending={tasks.length} paid={21400 + (state.paid ? 1000 : 0) + (state.renewed ? 2100 : 0)}
      progress={(4 - tasks.length) / 4} onSelect={select} /></div>
    <MoneyOwedView data={demoMoney(state, names)} mode="home" locale={locale} t={money} onSelect={() => go('money')} />
    <div className="grid items-start gap-card-gap @min-[1000px]/demo-home:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div data-demo-target="needs"><HomeTaskListView t={home} old={old} locale={locale} tasks={tasks} count={tasks.length} contacts={new Map()} onSelect={select} /></div>
      <GlassCard data-demo-target="feed" className="grid content-start gap-stack p-card"><h3 className="flex justify-between text-md font-semibold">{t('feed')}<small className="text-xs text-lime">{t('live')}</small></h3>
        {state.feed.map(({ event, text }, i) => <DemoRow key={`${event}-${i}`} title={t(toastKeys[event] ?? 'successDetail', { name: text })} detail={event === 'set' ? text : undefined} time={t('now')} />)}
        {t('initialFeed').split('|').map((title, i) => <DemoRow key={title} title={title} detail={t('initialFeedDetails').split('|')[i]} time={t('initialFeedTimes').split('|')[i]} />)}
      </GlassCard>
    </div>
  </div>;
}
