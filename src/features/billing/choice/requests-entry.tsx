'use client';
import dynamic from 'next/dynamic';
const Requests = dynamic(() => import('./renewal-requests').then(m => m.RenewalRequests));
export function RequestsEntry({ playerId }: { playerId?: string }) { return <Requests playerId={playerId} />; }
