import { ChevronDown, X } from 'lucide-react';
import Image from 'next/image';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { guidedMessages } from './messages';
import { Summary } from './summary';
import type { Action, DemoState } from './state';
import type { DemoPlan } from './types';

export function GuideCard({ state, plans, dispatch, now, onAccount }: { state: DemoState; plans: readonly DemoPlan[]; dispatch: (action: Action) => void; now: () => number; onAccount: () => void }) {
  const t = useT(guidedMessages);
  if (state.guide !== 'open') return <Button className="fixed bottom-4 start-4 z-40" variant="secondary" onClick={() => dispatch({ type: 'patch', patch: { guide: 'open' } })}>{t('resume')}</Button>;
  return <aside data-guide aria-live="polite" className="demo-guide sheet fixed z-40 overflow-y-auto rounded-card border-t-2 border-lime p-card shadow-xl">
    <div aria-hidden className="pointer-events-none absolute end-12 top-0 -z-10 h-full w-20 -skew-x-[36deg] bg-lime-soft" />
    <header className="flex items-center gap-inline">
      <Image src="/brand/icon.png" alt="" width={34} height={34} className="shrink-0 rounded-control" />
      <div className="min-w-0 flex-1"><b className="block text-md font-extrabold">{t('guideTitle')}</b><p className="text-xs text-muted">{t('captainName')} · {t('playersCount', { n: state.n })}</p></div>
      <IconButton aria-label={t('minimize')} onClick={() => dispatch({ type: 'patch', patch: { guide: 'min' } })}><ChevronDown aria-hidden className="size-5" /></IconButton>
      <IconButton aria-label={t('close')} onClick={() => dispatch({ type: 'patch', patch: { guide: 'closed' } })}><X aria-hidden className="size-5" /></IconButton>
    </header>
    <div className="my-stack flex gap-1" aria-hidden>{Array.from({ length: 13 }, (_, i) => <i key={i} className={`h-1 flex-1 -skew-x-[36deg] ${i <= state.step ? 'bg-lime' : 'bg-line'}`} />)}</div>
    <div className="flex items-center gap-inline"><span aria-hidden dir="ltr" className="demo-step-number text-stat-large font-extrabold">{String(state.step + 1).padStart(2, '0')}</span><h2 className="min-w-0 flex-1 text-title font-extrabold">{t('titles').split('|')[state.step]}</h2></div>
    <p className="my-stack text-md text-muted">{t(`step${state.step}` as 'step0', { n: state.n })}</p>
    {state.step === 12 ? <Summary state={state} plans={plans} now={now()} onExplore={() => dispatch({ type: 'patch', patch: { guide: 'closed' } })} onAccount={onAccount} /> : <>
      {t('hints').split('|')[state.step] && <p className="my-stack rounded-control border border-lime/30 bg-lime-soft p-stack text-xs">{t('hints').split('|')[state.step]}</p>}
      <footer className="demo-guide-actions grid grid-cols-2 gap-inline"><Button block variant="secondary" disabled={state.step === 0} onClick={() => dispatch({ type: 'prev', now: now() })}>{t('prev')}</Button>
        <Button block onClick={() => dispatch({ type: 'next', now: now() })}>{t(state.step === 0 ? 'begin' : 'next')}</Button></footer>
    </>}
    {state.step === 12 && <Button block variant="secondary" className="mt-stack" onClick={() => dispatch({ type: 'restart', now: now() })}>{t('restart')}</Button>}
  </aside>;
}
