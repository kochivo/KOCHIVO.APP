import { Suspense } from 'react';
import { BillingScreen, fetchBilling } from '@/features/billing';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';

export default function BillingPage() {
  return <Suspense fallback={<LoadingState />}><BillingScreen data={fetchBilling()} today={localDate(new Date())} /></Suspense>;
}
