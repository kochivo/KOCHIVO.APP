import { createT, parseLocale } from '@/core/i18n';
import { templateMessages } from '@/features/templates';
import { TemplatesScreen } from '@/features/templates';
import { TemplateTrainingEntry } from '@/features/captain-workspace/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function TemplatesPage({ searchParams }: { searchParams?: Promise<{ plan?: string | string[] }> }) {
  const query = await searchParams;
  if (captainWorkspaceEnabled() && typeof query?.plan === 'string') return <TemplateTrainingEntry planId={query.plan} />;
  return <TemplatesScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(templateMessages, parseLocale(locale));
  return { title: t('templates') };
}
