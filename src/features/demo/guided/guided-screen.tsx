'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { guidedMessages } from './messages';
import { Intro } from './intro';
import { GuideCard } from './guide-card';
import { CaptainPane } from './captain-pane';
import { PhonePane } from './phone-pane';
import type { Action, DemoState } from './state';
import { useTarget } from './use-target';
import { toastKeys } from './toast-keys';
import { pulse } from './pulse';
import { LazyState } from './lazy-state';
import type { DemoPlan } from './types';
import { ViewBoundary } from './view-boundary';
import { DemoHeader } from './demo-header';
import './guided.css';

const AccountDemo = dynamic(() => import('../components/demo-screen').then(m => m.DemoScreen), { loading: () => <LazyState /> });
export function GuidedScreen({ plans, state, dispatch, now, onLanguage }: { plans: readonly DemoPlan[]; state: DemoState; dispatch: (action: Action) => void; now: () => number; onLanguage: () => void }) {
  const [account, setAccount] = useState(false);
  const t = useT(guidedMessages), toast = useToast();
  useTarget(state);
  const act = (event: string, text?: string) => {
    if (event === 'set') pulse(document.querySelector('[data-demo-source="set"]'), document.querySelector('[data-demo-target="feed"]'));
    if (event === 'send' && state.chat === 'mohamed') pulse(document.querySelector('[data-demo-target="composer"]'), document.querySelector('[data-demo-target="coach-tab"]'));
    dispatch({ type: 'event', event, text: event === 'nudge' ? t('nudgeText') : text, now: now() });
    const key = event === 'set' && state.kg <= 62.5 ? 'setLogged' : toastKeys[event];
    if (key) toast.success({ title: t(key, { name: text ?? state.name }), detail: event === 'set' ? `${state.kg} ${t('kg')} × ${state.reps}` : t('successDetail'), icon: event === 'pay' || event === 'renew' ? 'payment' : event === 'send' || event === 'reply' ? 'message' : 'check' });
  };
  if (account) return <><div className="p-card"><Button variant="secondary" onClick={() => setAccount(false)}>{t('back')}</Button></div><ViewBoundary message={t('error')} retryLabel={t('retry')}><AccountDemo /></ViewBoundary></>;
  if (state.intro) return <Intro onChoose={n => dispatch({ type: 'start', n, now: now() })} />;
  const props = { state, dispatch, act, now };
  return <div data-guide-state={state.guide} className="demo-shell min-h-dvh bg-bg-deep text-ink">
    <DemoHeader state={state} dispatch={dispatch} now={now} onLanguage={onLanguage} />
    <main data-demo-stage data-view={state.view} className="demo-stage mx-auto max-w-[1480px] p-page-x"><CaptainPane {...props} plans={plans} /><PhonePane {...props} /></main>
    <GuideCard state={state} plans={plans} dispatch={dispatch} now={now} onAccount={() => setAccount(true)} />
  </div>;
}
