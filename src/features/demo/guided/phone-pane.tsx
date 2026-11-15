import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 shares the real player shell presentation. */
import { PlayerTabsView } from '@/features/player-shell/components/player-tabs-view';
import { messages as shellMessages } from '@/features/player-shell/messages';
/* eslint-enable no-restricted-imports */
import { guidedMessages } from './messages';
import { Workout } from './workout';
import { PhoneFood } from './phone-food';
import { PhoneMe } from './phone-me';
import { Chat } from './chat';
import type { PaneProps } from './types';

const paths = { workout: '/player', food: '/player/nutrition', coach: '/player/captain', me: '/player/progress' } as const;
export function PhonePane(props: PaneProps) {
  const { state, dispatch, now } = props, t = useT(guidedMessages), shell = useT(shellMessages), locale = useLocale();
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
        <PlayerTabsView pathname={paths[state.tab]} locale={locale} label={shell('navigation')}
          onSelect={href => { const tab = (Object.entries(paths).find(([, path]) => path === href)?.[0] ?? 'workout') as keyof typeof paths;
            dispatch({ type: 'phone', tab, now: now() }); }} />
      </div>
      </div>
    </div>
  </section>;
}
