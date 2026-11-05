import { createT, parseLocale } from '@/core/i18n';
import { programMessages } from '@/features/programs';
import { ProgramBuilder } from '@/features/programs';

export default async function ProgramPage({ params }: { params: Promise<{ programId: string; locale: string }> }) {
  const { programId } = await params;
  return <ProgramBuilder key={programId} programId={programId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(programMessages, parseLocale(locale));
  return { title: t('programBuilder') };
}
