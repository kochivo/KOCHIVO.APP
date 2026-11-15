'use client';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useRamadan } from '@/lib/use-ramadan';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../ramadan/messages';
const Home = dynamic(() => import('./ramadan-home').then(m => m.RamadanHome), { loading: () => <LoadingState variant="detail" /> });
export function RamadanSlot({ now, playerId, duration }: { now: Date; playerId?: string; duration?: number }) {
  const resource = useRamadan(), t = useT(messages);
  if (resource.error) return <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />;
  return resource.data?.active ? <Home now={now} playerId={playerId} duration={duration} status={resource.data} /> : null;
}
