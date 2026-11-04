'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { LoadingState } from '@/ui';
import { useTodayDecision } from '@/core/offline/use-today-decision';
import type { Decision } from '../score';

const DailyPanel = dynamic(() => import('./daily-panel').then(module => module.DailyPanel), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});

export function PlayerReadiness(props: { playerId?: string; today: string; rest: boolean; coachRest?: boolean;
  tomorrow?: string; tomorrowRest?: boolean; weightKg?: number; onDecisionChange?: (decision: Decision | null) => void }) {
  const decision = useTodayDecision(props.playerId, props.today);
  const onChange = props.onDecisionChange;
  useEffect(() => { onChange?.(decision); }, [decision, onChange]);
  return <DailyPanel {...props} rest={props.rest || decision === 'rest'} coachRest={decision === 'rest'} />;
}
