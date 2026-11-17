'use client';
import dynamic from 'next/dynamic';
const Requests = dynamic(() => import('./renewal-requests').then(m => m.RenewalRequests));
const Freezes = dynamic(() => import('../freeze/captain-requests').then(m => m.CaptainFreezeRequests));
export function RequestsEntry({ playerId, onDecided }: { playerId?: string; onDecided?: () => void }) { return <><Requests playerId={playerId} /><Freezes playerId={playerId} onDecided={onDecided} /></>; }
