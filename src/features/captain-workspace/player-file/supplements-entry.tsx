'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const FileSupplementsEntry = dynamic(() => import('@/features/supplements').then(module => module.CaptainSupplements), {
  ssr: false,
  loading: () => <LoadingState variant="list" />,
});
