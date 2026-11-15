import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { KoTraining, KoPlayerFood, KoCaptainChat, KoProgress } from '@/ui/icons';
import { guidedMessages } from './messages';
import { Workout } from './workout';
import { PhoneFood } from './phone-food';
import { PhoneMe } from './phone-me';
import { Chat } from './chat';
import type { PaneProps } from './types';

const tabs = [['workout', KoTraining], ['food', KoPlayerFood], ['coach', KoCaptainChat], ['me', KoProgress]] as const;
export function PhonePane(props: PaneProps) {
  const { state, dispatch, now } = props, t = useT(guidedMessages);
  return <section className="demo-player-column min-w-0" aria-label={t('phoneTitle')}>
    <p className="demo-pane-caption mb-stack text-xs text-muted"><b>{t('phoneTitle')}</b> · {t('player')}</p>
    <div className="demo-phone mx-auto" data-phone-frame>
      <div className="demo-phone-screen bg-bg">
        <div className="demo-phone-status text-xs font-bold tabular-nums" dir="ltr" aria-hidden>
          <span>{t('phoneTime')}</span><span className="demo-phone-notch" /><span>{t('phoneNetwork')}</span>
        </div>
      <div data-phone-content className="demo-phone-content min-h-0 flex-1 p-stack" data-area="player">
        {state.tab === 'workout' && <Workout {...props} />}{state.tab === 'food' && <PhoneFood {...props} />}
        {state.tab === 'coach' && <Chat {...props} phone />}{state.tab === 'me' && <PhoneMe {...props} />}
      </div>
      <nav data-phone-tabs className="demo-phone-tabs glass grid shrink-0 grid-cols-4 gap-inline p-stack" aria-label={t('player')}>
        {tabs.map(([tab, Icon]) => <Button key={tab} variant="secondary" className="min-w-0 flex-col px-0 text-micro" data-demo-target={tab === 'coach' ? 'coach-tab' : undefined} aria-current={state.tab === tab ? 'page' : undefined} onClick={() => dispatch({ type: 'phone', tab, now: now() })}><Icon className="size-5" /><span>{t(tab)}</span>{tab === 'coach' && state.unread > 0 && <b className="rounded-full bg-lime px-2 text-on-lime">{state.unread}</b>}</Button>)}
      </nav>
      </div>
    </div>
  </section>;
}
