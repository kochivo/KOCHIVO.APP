import { createT, parseLocale } from '@/core/i18n';
import { Suspense } from 'react';
import { messages } from '@/features/billing';
import { BillingScreen } from '../../../../../features/billing/components/billing-screen';
import { fetchBilling } from '../../../../../features/billing/data/billing';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: createT(messages, parseLocale(locale))('billing') };
}

export default function BillingPage() {
  return <Suspense fallback={<LoadingState variant="cards" />}><BillingScreen data={fetchBilling()} today={localDate(new Date())} /></Suspense>;
}
