'use client';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { loadSubscription } from '../data/subscription';
import { messages } from '../messages';
import { WorkspacePlan } from './workspace-plan';

export function SubscriptionView() {
  const t = useT(messages);
  const resource = useResource('billing:subscription', loadSubscription);
  if (resource.error) return <ErrorState message={t('planLoadFailed')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />;
  return resource.data ? <WorkspacePlan data={resource.data} /> : <LoadingState variant="detail" />;
}
