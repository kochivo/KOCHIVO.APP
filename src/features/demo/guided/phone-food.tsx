import { useT } from '@/core/i18n/client';
import { Check } from 'lucide-react';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
import { guidedMessages } from './messages';
import { DemoRing } from './demo-ring';
import type { PaneProps } from './types';

export function PhoneFood({ state, dispatch, act }: PaneProps) {
  const t = useT(guidedMessages), calories = state.eaten.reduce((total, eaten, i) => total + (eaten ? [520, 780, 310, 640][i] ?? 0 : 0), 0);
  return <><h3 className="text-title font-semibold">{t('food')}</h3><GlassCard level="strong" className="grid place-items-center p-card"><DemoRing value={calories} max={2450} label={t('of', { n: 2450 })} /></GlassCard>
    {t('meals').split('|').map((name, index) => <Button key={name} variant="secondary" className="justify-between" aria-pressed={state.eaten[index]} onClick={() => dispatch({ type: 'eat', index })}><span>{name}</span><b>{[520, 780, 310, 640][index]}</b>{state.eaten[index] && <Check aria-hidden className="size-4" />}</Button>)}
    <GlassCard className="grid gap-stack p-card"><p className="text-sm">{t('alternatives').split('|')[state.swap]}</p><Button variant="secondary" onClick={() => act('swap')}>{t('swap')}</Button></GlassCard>
  </>;
}
