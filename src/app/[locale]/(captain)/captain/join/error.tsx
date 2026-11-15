'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '@/ui/messages';
import { Button } from '@/ui/button';

export default function JoinError({ retry }: { retry: () => void }) {
  const t = useT(messages);
  return <div className="glass space-y-card-gap rounded-card p-card">
    <p role="alert">{t('somethingWentWrong')}</p>
    <Button className="min-h-12" onClick={retry}>{t('tryAgain')}</Button>
  </div>;
}
