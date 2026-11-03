import { InboxScreen, messages } from '@/features/inbox';
import { createT, parseLocale } from '@/core/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: createT(messages, parseLocale(locale))('inbox') };
}

export default function InboxPage() {
  return <InboxScreen />;
}
