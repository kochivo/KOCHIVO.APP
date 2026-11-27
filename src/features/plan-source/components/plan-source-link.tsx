import 'server-only';

import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import type { Locale } from '@/core/i18n/locale';
import { buttonClass } from '@/ui/button';
import { findPlanSource } from '../data/load-source';
import type { SourceKind } from '../data/load-source';
import { messages } from '../messages';

export async function PlanSourceLink({ id, kind, locale }: { id: string; kind: SourceKind; locale: Locale }) {
  const source = await findPlanSource(id, kind);
  if (!source) return null;
  const t = await getT(messages, locale);
  return <div className="mx-auto w-full px-page-x pt-stack">
    <Link className={buttonClass({ variant: 'secondary', block: false })} href={`/${locale}/captain/plan-source/${source}`}>
      {t('open')}
    </Link>
  </div>;
}
