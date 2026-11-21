import { useT } from '@/core/i18n/client';
import { KoHome } from '@/ui/icons/ko-home';
import { KoTraining } from '@/ui/icons/ko-training';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import { KoProgress } from '@/ui/icons/ko-progress';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function DemoPlayerNav({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages);
  const items = [
    { tab: 'workout', key: 'workout', Icon: KoHome }, { tab: 'food', key: 'food', Icon: KoMealPlans },
    { tab: 'workout', key: 'done', Icon: KoTraining }, { tab: 'me', key: 'progress', Icon: KoProgress },
    { tab: 'coach', key: 'coach', Icon: KoCaptainChat },
  ] as const;
  return <nav className="demo-player-nav" aria-label={t('changeView')}>{items.map(({ tab, key, Icon }, i) => <button type="button" key={key}
    aria-label={i === 2 ? t('workout') : undefined} aria-current={state.tab === tab && i !== 2 ? 'page' : undefined}
    className={i === 2 ? 'demo-player-workout' : 'demo-player-tab'} onClick={() => dispatch({ type: 'phone', tab, now: now() })}>
    <Icon aria-hidden className="size-5" />{i !== 2 && <span>{t(key)}</span>}
  </button>)}</nav>;
}
