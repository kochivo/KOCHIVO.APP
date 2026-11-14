import 'server-only';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { getLocale, getT } from '@/core/i18n/server';
import { fetchMoneyOwed } from '@/features/billing/server';
import { MoneyOwedView } from './money-owed-view';
import { messages } from './messages';

export async function MoneyOwedContent({ mode, playerId }: { mode: 'home' | 'billing' | 'player'; playerId?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT(messages)]);
  let data;
  try {
    data = await fetchMoneyOwed();
  } catch (error) {
    unstable_rethrow(error);
    return <div role="alert" className="glass rounded-card p-4 text-sm">
      <p>{t('error')}</p><Link href={mode === 'player' ? `/captain/players/${playerId}` : mode === 'home' ? '/captain' : '/captain/billing'}
        className="inline-flex min-h-12 items-center underline">{t('retry')}</Link>
    </div>;
  }
  return <MoneyOwedView data={data} mode={mode} playerId={playerId} locale={locale} t={t} />;
}
