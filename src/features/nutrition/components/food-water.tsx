'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, stableId, useLiveQuery } from '@/core/offline';
import { useTimezone } from '@/core/timezone/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { readDailyCheck, saveDailyCheck, waterGoalMl } from '@/features/readiness';
import { formatNumber } from '@/lib/format';
import { ErrorState, LoadingState } from '@/ui';
import { messages } from '../v6-messages';

export function FoodWater({ playerId, today }: { playerId?: string; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [weight, setWeight] = useState<{ playerId: string; value: number | null }>();
  const onError = useCallback(() => setError(true), []);
  const read = useCallback(async () => {
    const db = localDb();
    const owner = playerId ?? db.userId;
    return { playerId, today, owner, row: owner && today ? await readDailyCheck(db, owner, today) : null };
  }, [playerId, today]);
  const result = useLiveQuery(read, onError, revision);
  const owner = result?.playerId === playerId && result?.today === today ? result?.owner : undefined;
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!owner || !today || !navigator.onLine) return;
      try {
        const client = await loadSupabaseBrowser();
        const [check, intake, latest] = await Promise.all([
          client.from('daily_checks').select('*').eq('player_id', owner).eq('log_date', today).maybeSingle(),
          client.from('player_intake').select('weight_kg').eq('player_id', owner).maybeSingle(),
          client.from('check_ins').select('body_weight_kg').eq('player_id', owner).not('body_weight_kg', 'is', null)
            .order('week_start', { ascending: false }).limit(1),
        ]);
        if (cancelled) return;
        if (check.error || intake.error || latest.error) throw check.error ?? intake.error ?? latest.error;
        setWeight({ playerId: owner, value: latest.data?.[0]?.body_weight_kg ?? intake.data?.weight_kg ?? null });
        const remote = check.data;
        if (remote) {
          const db = localDb();
          const id = await stableId('daily_check', owner, today);
          await db.transaction('rw', db.daily_checks, async () => {
            const local = await db.daily_checks.get(id);
            if (!local || Date.parse(remote.client_updated_at) > Date.parse(local.client_updated_at)) await db.daily_checks.put({
              id, log_date: today, sleep_hours: remote.sleep_hours, soreness: remote.soreness,
              water_ml: remote.water_ml, deleted_at: remote.deleted_at, client_updated_at: remote.client_updated_at,
            });
          });
        }
      } catch { if (!cancelled) setError(true); }
    }
    void refresh();
    window.addEventListener('online', refresh);
    return () => { cancelled = true; window.removeEventListener('online', refresh); };
  }, [owner, today, revision]);
  async function add() {
    if (!owner || busy) return;
    setBusy(true);
    try { await saveDailyCheck(localDb(), owner, {}, 250, Date.now(), timezone); setError(false); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  const ready = result?.playerId === playerId && result?.today === today;
  const goal = waterGoalMl(weight?.playerId === owner ? weight?.value : undefined);
  return <div className="space-y-inline">
    {error && <ErrorState message={t('waterError')} retryLabel={t('retry')} onRetry={() => { setError(false); setRevision(value => value + 1); }} />}
    {!ready ? !error && <LoadingState variant="detail" /> : <div className="flex items-center gap-stack rounded-[22px] border border-line-soft bg-surface px-stack py-stack">
      <span className="flex-1 text-sm">{t('water')} <b className="font-[family-name:var(--font-manrope)] text-water">{formatNumber((result.row?.water_ml ?? 0) / 250, locale)}</b>
        <span className="text-muted">{t('cups', { goal: formatNumber(goal / 250, locale) })}</span>
      </span>
      <button type="button" aria-label={t('addWater')} disabled={!owner || busy} onClick={() => void add()}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-water/15 text-water disabled:opacity-50"><Plus aria-hidden className="size-6" /></button>
    </div>}
  </div>;
}
