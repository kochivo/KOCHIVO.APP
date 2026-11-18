import 'server-only';
import { Suspense } from 'react';
import { getT } from '@/core/i18n/server';
import { messages } from './messages';
import { MoneyOwedContent } from './money-owed-content';

export async function MoneyOwedEntry({ mode, playerId }: { mode: 'home' | 'billing' | 'player'; playerId?: string }) {
  const t = await getT(messages);
  const fallback = mode === 'billing'
    ? <p data-billing-feedback role="status" className="px-card text-sm text-muted">{t('loading')}</p>
    : <p role="status" className="glass rounded-card p-card text-sm text-muted">{t('loading')}</p>;
  return <Suspense fallback={fallback}>
    <MoneyOwedContent mode={mode} playerId={playerId} />
  </Suspense>;
}
