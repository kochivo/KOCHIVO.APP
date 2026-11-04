'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

const Scans = dynamic(() => import('./scan-section').then(module => module.ScanSection), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});

export function BodyScansLoader({ playerId }: { playerId?: string }) {
  return <Scans key={playerId ?? 'self'} playerId={playerId} />;
}
