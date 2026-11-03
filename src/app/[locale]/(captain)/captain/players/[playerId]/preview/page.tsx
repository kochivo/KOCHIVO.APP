import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchPlayerPreview, PreviewScreen } from '@/features/player-preview';
import { localDate } from '@/lib/dates';

export default async function PlayerPreviewPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const today = localDate(new Date());
  return <Suspense fallback={<p role="status" className="p-4 text-muted">جاري تحميل المعاينة</p>}>
    {fetchPlayerPreview(playerId, today).then((result) => {
      if ('data' in result && result.data === null) notFound();
      return <PreviewScreen result={result} today={today} />;
    })}
  </Suspense>;
}
