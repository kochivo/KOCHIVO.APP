'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCrownPrize, loadHallOfFame, loadLeaderboard } from '@/features/ranks';
import type { HallOfFameRow, LeaderboardRow } from '@/features/ranks';
import { currentMonth } from '../months';
import { canEditPrize, persistPrize, saveCrownPrize } from '../data/save-crown-prize';

export function useLeaderboard(initialNow = new Date()) {
  const [now, setNow] = useState(() => initialNow);
  const [month, setMonth] = useState(() => currentMonth(now));
  const [result, setResult] = useState<{ month: string; revision: number; rows?: LeaderboardRow[];
    prize?: string | null; error: boolean }>();
  const [edits, setEdits] = useState<Record<string, { prize: string | null; saving: boolean; error: boolean }>>({});
  const editVersion = useRef(0);
  const [revision, setRevision] = useState(0);
  const [hall, setHall] = useState<{ revision: number; rows?: HallOfFameRow[]; error: boolean }>();
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    void loadHallOfFame().then(rows => { if (!cancelled) setHall({ revision, rows, error: false }); })
      .catch(() => { if (!cancelled) setHall({ revision, error: true }); });
    return () => { cancelled = true; };
  }, [revision]);
  useEffect(() => {
    const update = () => setNow(new Date());
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const version = editVersion.current;
    void Promise.all([loadLeaderboard(month), loadCrownPrize(month)]).then(([rows, prize]) => {
      if (!cancelled) {
        setResult({ month, revision, rows, prize, error: false });
        setEdits(previous => {
          if (version !== editVersion.current || previous[month]?.saving) return previous;
          const next = { ...previous }; delete next[month]; return next;
        });
      }
    }).catch(() => { if (!cancelled) setResult({ month, revision, error: true }); });
    return () => { cancelled = true; };
  }, [month, revision]);
  const active = result?.month === month && result.revision === revision ? result : undefined;
  const currentEdit = edits[month];
  const prize = currentEdit ? currentEdit.prize : active?.prize ?? null;
  async function savePrize(value: string | null) {
    if (!canEditPrize(month, now) || currentEdit?.saving) throw new Error('Prize cannot be edited');
    editVersion.current += 1;
    const show = (value: string | null, saving: boolean, error: boolean) =>
      setEdits(previous => ({ ...previous, [month]: { prize: value, saving, error } }));
    try {
      await persistPrize(value, prize, next => show(next, true, false),
        () => saveCrownPrize(month, value));
      show(value, false, false);
    } catch (error) {
      show(prize, false, true);
      throw error;
    } finally {
      editVersion.current += 1;
    }
  }
  return { now, month, rows: active?.rows, error: active?.error ?? false, setMonth, reload,
    hall: hall?.revision === revision ? hall.rows : undefined, hallError: hall?.revision === revision && hall.error,
    prize, savePrize, prizeSaving: currentEdit?.saving ?? false, prizeError: currentEdit?.error ?? false };
}
