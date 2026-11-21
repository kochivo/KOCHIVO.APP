import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';

export function JoinRequests({ state, act, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages);
  if (state.joined) return <GlassCard className="grid max-w-xl gap-stack p-card text-center"><h3 className="text-title">{t('joinDone')}</h3>
    <Button variant="secondary" onClick={() => dispatch({ type: 'go', page: 'players', now: now() })}>{t('players')}</Button></GlassCard>;
  return <GlassCard className="grid max-w-2xl gap-stack p-card"><h3>{t('joinTitle')}</h3>
    <DemoRow title={t('defaultName')} detail={t('joinDetail')}><Button block={false} onClick={() => act('joinok')}>{t('joinApprove')}</Button></DemoRow>
    <Button variant="secondary" onClick={() => dispatch({ type: 'go', page: 'home', now: now() })}>{t('joinDecline')}</Button>
  </GlassCard>;
}
