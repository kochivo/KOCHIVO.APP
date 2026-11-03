'use client';
import { useRouter } from 'next/navigation';
import { ErrorState } from '@/ui';

export function DemoProfileError() {
  const router = useRouter();
  return <ErrorState message="مش قادرين نحمّل الحساب" retryLabel="جرّب تاني" onRetry={() => router.refresh()} />;
}
