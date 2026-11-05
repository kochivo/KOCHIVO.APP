'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { messages } from './tour/messages';

export function TourReplay({ role }: { role: 'captain' | 'player' }) {
  const t = useT(messages);
  const router = useRouter();
  return <button type="button" className="glass flex min-h-12 w-full items-center rounded-control px-4 text-start"
    onClick={() => {
      window.dispatchEvent(new Event('kochivo:replay-tour'));
      router.push(`/${role}`);
    }}>{t('replay')}</button>;
}
