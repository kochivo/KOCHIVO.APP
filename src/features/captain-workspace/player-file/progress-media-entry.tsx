'use client';
import dynamic from 'next/dynamic';
import type { GalleryWeek, TrendPoint } from '@/features/progress';
import { LoadingState } from '@/ui/loading-state';

const Chart = dynamic(() => import('@/features/progress').then(module => module.LineChart), { ssr: false, loading: () => <LoadingState variant="cards" /> });
const Gallery = dynamic(() => import('@/features/progress').then(module => module.ProgressGallery), { ssr: false, loading: () => <LoadingState variant="cards" /> });

export function ProgressMediaEntry(props: { points?: readonly TrendPoint[]; bodyFat?: readonly TrendPoint[]; title: string; unit: string; weeks?: readonly GalleryWeek[] }) {
  if (props.weeks) return <Gallery weeks={props.weeks} />;
  return <Chart points={props.points ?? []} bodyFat={props.bodyFat} title={props.title} unit={props.unit} />;
}
