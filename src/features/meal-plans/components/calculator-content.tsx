import { createT } from '@/core/i18n';
import { getPlayerTimezone } from '@/core/timezone/server';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import type { Locale } from '@/core/i18n';
import { supabaseServer } from '@/core/supabase/server';
import { loadPlayerFile } from '@/features/player-file';
import type { PlayerFile } from '@/features/player-file';
import Link from 'next/link';
import { listPlayerPlans } from '../data/plan-io';
import type { PlanSummary } from '../types';
import { CalculatorView } from './calculator-view';
import { messages } from './calculator/messages';
import { buttonClass } from '@/ui/button';

export async function CalculatorContent({ playerId, locale }: { playerId: string; locale: Locale }) {
  const t = createT(messages, locale);
  let data: { file: PlayerFile; plans: PlanSummary[] } | undefined;
  try {
    const client = await supabaseServer();
    const [file, plans] = await Promise.all([loadPlayerFile(client, playerId), listPlayerPlans(playerId)]);
    if (!plans.ok) throw new Error('Could not load plans');
    data = { file, plans: plans.data.filter(plan => plan.status !== 'archived') };
  } catch {
    data = undefined;
  }
  if (!data) return <section role="alert" className="glass grid gap-3 rounded-card p-5">
      <p>{t('loadFailed')}</p><Link className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-4" })} href={`/captain/players/${playerId}/nutrition?view=calc`}>{t('retry')}</Link>
    </section>;
  return <TimezoneScope timezone={await getPlayerTimezone(playerId)}><CalculatorView playerId={playerId} file={data.file} plans={data.plans} /></TimezoneScope>;
}
