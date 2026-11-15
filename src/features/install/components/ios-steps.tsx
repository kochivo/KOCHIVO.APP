'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Check, Share, SquarePlus } from 'lucide-react';

export function IosSteps() {
  const t = useT(messages);
  return <ol className="mt-card-gap space-y-card-gap text-sm">
    <li className="flex items-center gap-stack"><Share aria-hidden className="size-6 shrink-0" />{t('tapShare')}</li>
    <li className="flex items-center gap-stack"><SquarePlus aria-hidden className="size-6 shrink-0" />{t('chooseAddToHomeScreen')}</li>
    <li className="flex items-center gap-stack"><Check aria-hidden className="size-6 shrink-0" />{t('tapAdd')}</li>
  </ol>;
}
