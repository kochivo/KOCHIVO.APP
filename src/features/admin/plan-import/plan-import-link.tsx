import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { buttonClass } from '@/ui/button';
import { messages } from '../messages';

export function PlanImportLink() {
  const locale = useLocale(), t = useT(messages);
  return <div><Link href={`/${locale}/admin/import-plans`} className={buttonClass({ variant: 'secondary', block: false })}>
    {t('planImport')}
  </Link></div>;
}
