'use client';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { useT } from '@/core/i18n/client';
import type { PlayerProgramSummary } from './player-program-summary';
import { messages } from './player-program-messages';

function Loading() {
  return <p role="status" className="glass rounded-card p-card">{useT(messages)('loading')}</p>;
}

// Split inside a client boundary; server-side dynamic imports do not split client code.
const Summary = dynamic(() => import('./player-program-summary').then(module => module.PlayerProgramSummary), { loading: Loading });

export function PlayerProgramSummaryEntry(props: ComponentProps<typeof PlayerProgramSummary>) {
  return <Summary {...props} />;
}
