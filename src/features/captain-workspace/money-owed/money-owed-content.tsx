import 'server-only';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { getLocale, getT } from '@/core/i18n/server';
import { fetchMoneyOwed } from '@/features/billing/server';
import { MoneyOwedView } from './money-owed-view';
import { MoneyOwedBillingTask } from './money-owed-billing-task';
import { messages } from './messages';

export async function MoneyOwedContent({ mode, playerId }: { mode: 'home' | 'billing' | 'player'; playerId?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT(messages)]);
  let data;
  try {
    data = await fetchMoneyOwed();
  } catch (error) {
    unstable_rethrow(error);
    if (mode === 'billing') return <div data-billing-feedback role="alert" className="px-card text-sm">
      {t('error')} <Link href="/captain/billing" className="inline-flex min-h-12 items-center underline">{t('retry')}</Link>
    </div>;
    return <div role="alert" className="glass rounded-card p-card text-sm">
      <p>{t('error')}</p><Link href={mode === 'player' ? `/captain/players/${playerId}` : '/captain'}
        className="inline-flex min-h-12 items-center underline">{t('retry')}</Link>
    </div>;
  }
  if (mode === 'billing') return <MoneyOwedBillingTask data={data} locale={locale} t={t} />;
  return <MoneyOwedView data={data} mode={mode} playerId={playerId} locale={locale} t={t} />;
}
