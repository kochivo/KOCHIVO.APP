import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function KoPreviewPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  // Layouts and pages render in parallel, so the layout guard alone still streams this page's payload.
  if (process.env.NODE_ENV !== 'development') notFound();
  const { KoDemo } = await import('./demo');
  return <KoDemo initialRole={(await searchParams).role === 'player' ? 'player' : 'captain'} />;
}
