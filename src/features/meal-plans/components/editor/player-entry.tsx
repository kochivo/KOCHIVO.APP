'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import type { loadPlayerEditor } from '../../data/player-editor';

const PlayerEditor = dynamic(() => import('./player-editor').then(module => module.PlayerEditor),
  { loading: () => <LoadingState variant="detail" /> });

export function PlayerEditorEntry({ data }: { data: Awaited<ReturnType<typeof loadPlayerEditor>> }) {
  return <PlayerEditor key={data.draft.id} data={data} editableMealNames restViewOnly />;
}
