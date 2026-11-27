import { parseLocale } from '@/core/i18n';
import { PlanSourcePage } from '@/features/plan-source/server';

export const metadata = { robots: { index: false } };

export default async function CaptainPlanSourcePage({ params, searchParams }: {
  params: Promise<{ sourceId: string; locale: string }>;
  searchParams: Promise<{ tab?: string | string[]; q?: string | string[] }>;
}) {
  const { sourceId, locale } = await params;
  const { tab, q } = await searchParams;
  return <PlanSourcePage id={sourceId} locale={parseLocale(locale)}
    tab={typeof tab === 'string' ? tab : undefined} query={typeof q === 'string' ? q : undefined} />;
}
