'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useRouter } from 'next/navigation';
import { ErrorState } from '@/ui';

export function DemoProfileError() {
  const t = useT(messages);
  const router = useRouter();
  return <ErrorState message={t('couldnTLoadYourAccount')} retryLabel={t('tryAgain')} onRetry={() => router.refresh()} />;
}
