import { PlayerFormPage } from '@/features/forms/server';
import { parseLocale } from '@/core/i18n/locale';
export default async function Page({params}:{params:Promise<{locale:string;requestId:string}>}) {
  const {locale,requestId} = await params;
  return <PlayerFormPage locale={parseLocale(locale)} requestId={requestId} />;
}
