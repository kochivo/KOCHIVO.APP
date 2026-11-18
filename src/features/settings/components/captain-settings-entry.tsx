'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { LoadingState } from '@/ui/loading-state';

const Workspace = dynamic(() => import('./captain-settings').then(module => module.CaptainSettings), {
  loading: () => <LoadingState variant="detail" />,
});

export function CaptainSettings(props: { signOut?: ReactNode; connectedTools?: { userId: string; url: string } | null }) {
  return <Suspense fallback={<LoadingState variant="detail" />}><Workspace {...props} /></Suspense>;
}
