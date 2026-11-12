'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const FileVoiceEntry = dynamic(() => import('./voice-content').then(module => module.FileVoiceContent), {
  ssr: false, loading: () => <LoadingState variant="list" />,
});
