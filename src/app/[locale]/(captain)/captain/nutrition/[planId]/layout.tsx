import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { parseLocale } from '@/core/i18n';
import { PlanSourceLink } from '@/features/plan-source/server';

export default async function NutritionPlanLayout({ children, params }: {
  children: ReactNode; params: Promise<{ planId: string; locale: string }>;
}) {
  const { planId, locale } = await params;
  return <>
    <Suspense fallback={null}><PlanSourceLink id={planId} kind="nutrition" locale={parseLocale(locale)} /></Suspense>
    {children}
  </>;
}
