import { parseLocale } from '@/core/i18n/locale';
import { formsAccess, FormsLibraryPage } from '@/features/forms/server';

export default async function FormsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams?: Promise<{ edit?: string; template?: string }>;
}) {
  const { captain, client } = await formsAccess();
  const { locale } = await params;
  return <FormsLibraryPage captain={captain} client={client} locale={parseLocale(locale)} query={await searchParams ?? {}} />;
}
