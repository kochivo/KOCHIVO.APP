'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Check, Share, SquarePlus } from 'lucide-react';

export function IosSteps() {
  const t = useT(messages);
  return <ol className="mt-5 space-y-4 text-sm">
    <li className="flex items-center gap-3"><Share aria-hidden className="size-6 shrink-0" />{t('tapShare')}</li>
    <li className="flex items-center gap-3"><SquarePlus aria-hidden className="size-6 shrink-0" />{t('chooseAddToHomeScreen')}</li>
    <li className="flex items-center gap-3"><Check aria-hidden className="size-6 shrink-0" />{t('tapAdd')}</li>
  </ol>;
}
