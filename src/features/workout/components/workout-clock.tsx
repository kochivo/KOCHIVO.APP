'use client';
import { useEffect, useState } from 'react';
import { useLocale } from '@/core/i18n/client';
import { formatRest } from '../rest';

export function WorkoutClock({ startedAt }: { startedAt?: string }) {
  const locale = useLocale();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const update = () => setSeconds(startedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000)) : 0);
    const timer = window.setInterval(update, 1000);
    update();
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [startedAt]);
  return <span className="font-display font-extrabold tabular-nums text-lime"><bdi>{formatRest(seconds, locale)}</bdi></span>;
}
