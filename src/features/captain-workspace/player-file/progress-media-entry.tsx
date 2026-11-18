'use client';
import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import type { GalleryWeek, TrendPoint } from '@/features/progress';
import { LoadingState } from '@/ui/loading-state';

const Chart = dynamic(() => import('@/features/progress').then(module => module.LineChart), { ssr: false, loading: () => <LoadingState variant="cards" /> });
const Gallery = dynamic(() => import('@/features/progress').then(module => module.ProgressGallery), { ssr: false, loading: () => <LoadingState variant="cards" /> });

const phoneQuery = '(width < 48rem)';
function subscribe(onChange: () => void) {
  const query = window.matchMedia(phoneQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const isPhone = () => window.matchMedia(phoneQuery).matches;
const isServerPhone = () => false;

export function ProgressMediaEntry(props: { points?: readonly TrendPoint[]; bodyFat?: readonly TrendPoint[]; title: string; unit: string; weeks?: readonly GalleryWeek[]; today?: string; target?: number | null; compactOnPhone?: boolean }) {
  if (props.weeks) return <Gallery weeks={props.weeks} />;
  if (props.compactOnPhone) return <PhoneResponsiveChart {...props} />;
  return <Chart points={props.points ?? []} bodyFat={props.bodyFat} title={props.title} unit={props.unit} today={props.today} target={props.target} />;
}

function PhoneResponsiveChart({ points = [], bodyFat, title, unit, today, target }: Parameters<typeof ProgressMediaEntry>[0]) {
  const phone = useSyncExternalStore(subscribe, isPhone, isServerPhone);
  return <Chart points={points} bodyFat={bodyFat} title={title} unit={unit} today={today} target={target} compact={phone ? 'lime' : undefined} />;
}
