import { createT, parseLocale } from '@/core/i18n';
import { templateMessages } from '@/features/templates';
import { TemplatesScreen } from '@/features/templates';

export default function TemplatesPage() {
  return <TemplatesScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(templateMessages, parseLocale(locale));
  return { title: t('templates') };
}
