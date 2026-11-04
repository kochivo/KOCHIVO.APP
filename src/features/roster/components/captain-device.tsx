'use client';
import { useDeviceRole } from '@/core/pwa/use-device-role';
import dynamic from 'next/dynamic';

const FeedbackButton = dynamic(() => import('@/features/feedback').then(module => module.FeedbackButton), { ssr: false });
const InstallSheet = dynamic(() => import('@/features/install').then(module => module.InstallSheet), { ssr: false });

export function CaptainDevice() {
  useDeviceRole('captain');
  return <><FeedbackButton role="captain" /><InstallSheet role="captain" /></>;
}
