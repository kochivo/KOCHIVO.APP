'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const FileChatEntry = dynamic(() => import('@/features/chat').then(module => module.CaptainChat), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});
