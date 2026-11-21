import { useT } from '@/core/i18n/client';
import { guidedMessages } from './messages';
import { DemoPlayerNav } from './demo-player-nav';
import { Workout } from './workout';
import { PhoneFood } from './phone-food';
import { PhoneMe } from './phone-me';
import { Chat } from './chat';
import type { PaneProps } from './types';

export function PhonePane(props: PaneProps) {
  const { state } = props, t = useT(guidedMessages);
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
      <div data-phone-tabs data-demo-target="coach-tab" className="demo-phone-tabs shrink-0">
        <DemoPlayerNav {...props} />
      </div>
      </div>
    </div>
  </section>;
}
