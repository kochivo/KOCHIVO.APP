'use client';
import dynamic from 'next/dynamic';
import { ThemeSwitch } from '@/ui/theme-switch';
import { TourReplay } from '@/ui/tour-replay';
import { PushToggleCard } from '@/features/notifications';
import { GlassToggle } from './glass-toggle';

const Install = dynamic(() => import('@/features/install').then(m => m.InstallButton), { ssr: false });
export function WorkspaceOptions() {
  return <div className="space-y-4"><GlassToggle /><ThemeSwitch /><Install role="captain" /><PushToggleCard /><TourReplay role="captain" /></div>;
}
