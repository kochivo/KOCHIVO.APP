import 'server-only';
import { Suspense } from 'react';
import { getLocale } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import { PlayerFileEntry } from '../player-file/file-entry';
import { TrainingContent } from './training-content';
import { messages } from './messages';

export async function TrainingEntry({ playerId }: { playerId: string }) {
  const t = createT(messages, await getLocale());
  return <PlayerFileEntry playerId={playerId} tab="training">
    <Suspense fallback={<div role="status" className="glass min-h-64 rounded-card p-5 text-faint">{t('loading')}</div>}>
      <TrainingContent playerId={playerId} />
    </Suspense>
  </PlayerFileEntry>;
}
