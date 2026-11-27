import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { parseLocale } from '@/core/i18n';
import { PlanSourceLink } from '@/features/plan-source/server';

export default async function ProgramLayout({ children, params }: {
  children: ReactNode; params: Promise<{ programId: string; locale: string }>;
}) {
  const { programId, locale } = await params;
  return <>
    <Suspense fallback={null}><PlanSourceLink id={programId} kind="training" locale={parseLocale(locale)} /></Suspense>
    {children}
  </>;
}
