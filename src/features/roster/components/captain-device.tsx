'use client';
import { useDeviceRole } from '@/core/pwa/use-device-role';
import dynamic from 'next/dynamic';

const FeedbackButton = dynamic(() => import('@/features/feedback').then(module => module.FeedbackButton), { ssr: false });
const InstallSheet = dynamic(() => import('@/features/install').then(module => module.InstallSheet), { ssr: false });
const KoPreview = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/features/ko-preview').then(module => module.KoPreview), { ssr: false }) : () => null;

export function CaptainDevice() {
  useDeviceRole('captain');
  if (process.env.NODE_ENV === 'development') return <><FeedbackButton role="captain" /><InstallSheet role="captain" /><KoPreview role="captain" /></>;
  return <><FeedbackButton role="captain" /><InstallSheet role="captain" /></>;
}
