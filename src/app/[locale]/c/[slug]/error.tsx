'use client';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from './messages';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT(messages);
  return <main className="mesh min-h-dvh p-6"><p role="alert">{t('failure')}</p>
    <Button variant="secondary" onClick={reset}>{t('retry')}</Button></main>;
}
