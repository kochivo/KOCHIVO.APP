import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { scaled } from './state';
import { DemoRow } from './demo-row';
import { DemoRing } from './demo-ring';
import type { PaneProps } from './types';
import { toastKeys } from './toast-keys';

export function CaptainHome({ state, dispatch, act, now }: PaneProps) {
  const t = useT(guidedMessages), names = t('names').split('|'), { trained } = scaled(state.n);
  const locale = useLocale();
  const tasks = [!state.approved, !state.nudged, !state.renewed, !state.paid];
  const tiles = [
    { key: 'waiting', value: tasks.filter(Boolean).length, tone: 'text-lime' },
    { key: 'ending', value: state.renewed ? 1 : 2, tone: 'text-muted' },
    { key: 'owed', value: state.paid ? 500 : 1500, tone: 'text-warn' },
  ] as const;
  return <>
    <GlassCard level="strong" data-demo-target="kpis" className="grid gap-card-gap p-card min-[1200px]:grid-cols-[auto_1fr]">
      <div className="flex items-center gap-inline"><DemoRing value={trained} max={state.n} label={t('of', { n: state.n })} /><div><h3 className="text-title font-semibold">{t('trained', { n: trained })}</h3><p className="text-xs text-muted">{t('needsDetails').split('|')[1]}</p></div></div>
      <div className="grid grid-cols-3 gap-inline">{tiles.map(({ key, value, tone }) =>
        <div key={key} className="recessed rounded-control p-stack"><p className="text-xs text-muted">{t(key)}</p><b className={`demo-tile-value ${tone}`}>{formatNumber(value, locale)}</b></div>)}</div>
    </GlassCard>
    <div className="grid gap-card-gap min-[1200px]:grid-cols-2">
      <GlassCard data-demo-target="needs" className="grid content-start gap-stack p-card"><h3 className="text-md font-semibold">{t('needs')}</h3>
        {tasks.map((visible, i) => visible && <DemoRow key={i} title={names[[1, 2, 3, 0][i] ?? 0]} detail={t('needsDetails').split('|')[i]}>
          <Button data-demo-target={i === 0 ? 'review' : undefined} variant="secondary" onClick={() => i === 0 || i === 3 ? dispatch({ type: 'go', page: i === 0 ? 'assess' : 'money', now: now() }) : act(i === 1 ? 'nudge' : 'renew')}>{t((['review', 'nudge', 'renew', 'pay'] as const)[i] ?? 'review')}</Button>
        </DemoRow>)}
        {!tasks.some(Boolean) && <div className="rounded-control border border-dashed border-line p-card"><b>{t('allDone')}</b><p className="text-sm text-muted">{t('allDoneDetail')}</p></div>}
      </GlassCard>
      <GlassCard data-demo-target="feed" className="grid content-start gap-stack p-card"><h3 className="flex justify-between text-md font-semibold">{t('feed')}<small className="text-xs text-lime">{t('live')}</small></h3>
        {state.feed.map(({ event, text }, i) => <DemoRow key={`${event}-${i}`} title={t(toastKeys[event] ?? 'successDetail', { name: text })} detail={event === 'set' ? text : undefined} time={t('now')} />)}
        {t('initialFeed').split('|').map((title, i) => <DemoRow key={title} title={title} detail={t('initialFeedDetails').split('|')[i]} time={t('initialFeedTimes').split('|')[i]} />)}
      </GlassCard>
    </div>
  </>;
}
