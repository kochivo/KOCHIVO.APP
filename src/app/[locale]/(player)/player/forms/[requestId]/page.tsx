import { PlayerFormPage } from '@/features/forms/server';
import { parseLocale } from '@/core/i18n/locale';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
export default async function Page({params}:{params:Promise<{locale:string;requestId:string}>}) {
  if (!captainWorkspaceEnabled()) notFound();
  const {locale,requestId} = await params;
  return <PlayerFormPage locale={parseLocale(locale)} requestId={requestId} />;
}
