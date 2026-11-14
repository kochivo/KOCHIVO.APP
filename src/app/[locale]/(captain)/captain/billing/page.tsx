import { getTimezone } from '@/core/timezone/server';
import { createT, parseLocale } from '@/core/i18n';
import { Suspense } from 'react';
import { messages, BillingScreen } from '@/features/billing';
import { fetchBilling } from '@/features/billing/server';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { MoneyOwedEntry } from '@/features/captain-workspace/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: createT(messages, parseLocale(locale))('billing') };
}

export default async function BillingPage() {
  return <Suspense fallback={<LoadingState variant="cards" />}><BillingScreen data={fetchBilling()}
    today={localDate(new Date(), await getTimezone())}
    moneyOwed={captainWorkspaceEnabled() ? <MoneyOwedEntry mode="billing" /> : undefined} /></Suspense>;
}
