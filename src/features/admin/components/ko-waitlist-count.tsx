'use client';
import { Button } from '@/ui/button';

import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

type Counts = { captain: number; player: number };

export function KoWaitlistCount({ initialCounts }: { initialCounts?: Counts }) {
  const t = useT(messages);
  const locale = useLocale();
  const [counts, setCounts] = useState<Counts | null>(initialCounts ?? null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setFailed(false);
      try {
        const db = await loadSupabaseBrowser();
        if (!active) return;
        const results = await Promise.all((['captain', 'player'] as const).map(role =>
          db.from('ko_waitlist').select('user_id', { count: 'exact', head: true }).eq('role', role)));
        if (results.some(result => result.error || result.count === null)) throw new Error('Waitlist count failed');
        if (active) setCounts({ captain: results[0]?.count ?? 0, player: results[1]?.count ?? 0 });
      } catch { if (active) setFailed(true); }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);
  return <section aria-label={t('koWaitlist')} className="space-y-3">
    <h2 className="text-lg font-bold">{t('koWaitlist')}</h2>
    {failed ? <div role="alert">
      <p className="text-danger">{t('failed')}</p>
      <Button variant="secondary" type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-12 underline">{t('retry')}</Button>
    </div> : counts ? <dl className="grid grid-cols-2 gap-3">
      {(['captain', 'player'] as const).map(role => <div key={role} className="glass-strong rounded-card p-5">
        <dt className="text-sm text-muted">{t(role === 'captain' ? 'koWaitlistCaptains' : 'koWaitlistPlayers')}</dt>
        <dd className="mt-3 text-4xl font-extrabold tabular-nums">{formatNumber(counts[role], locale)}</dd>
      </div>)}
    </dl> : <p role="status" className="text-muted">{t('loading')}</p>}
  </section>;
}
