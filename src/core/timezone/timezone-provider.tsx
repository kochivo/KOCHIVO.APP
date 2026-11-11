'use client';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { deviceTimezone, profileTimezone, timezoneSyncTarget } from '@/lib/timezone';
import { TimezoneContext, ViewerTimezoneContext } from './client';
import { setActionTimezone } from './action-timezone';
import { createTimezoneSync } from './sync';

export const TIMEZONE_CHANGED = 'kochivo:timezone';
export type TimezoneProfile = { id: string; timezone: string; timezone_auto: boolean };
function subscribeDevice(update: () => void) {
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', update);
  return () => { window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
}
const serverDevice = () => '';

export function TimezoneProvider({ profile, children }: { profile: TimezoneProfile | null; children: ReactNode }) {
  const [current, setCurrent] = useState(profile);
  const device = useSyncExternalStore(subscribeDevice, deviceTimezone, serverDevice);
  const router = useRouter();
  const [sync] = useState(() => createTimezoneSync(async (id, target) => {
    const client = await loadSupabaseBrowser();
    const result = await client.from('profiles').update({ timezone: target }).eq('id', id).eq('timezone_auto', true);
    if (result.error) throw result.error;
    setCurrent(previous => previous?.id === id && previous.timezone_auto ? { ...previous, timezone: target } : previous);
    router.refresh();
  }));
  useEffect(() => {
    setActionTimezone(current?.timezone_auto ? undefined : current?.timezone);
    return () => setActionTimezone(undefined);
  }, [current]);
  useEffect(() => {
    const changed = (event: Event) => {
      if (event instanceof CustomEvent) { setCurrent(event.detail as TimezoneProfile); sync.reset(); }
    };
    window.addEventListener(TIMEZONE_CHANGED, changed);
    return () => { window.removeEventListener(TIMEZONE_CHANGED, changed); };
  }, [sync]);
  const target = current && device && timezoneSyncTarget(current.timezone_auto, current.timezone, device);
  useEffect(() => {
    if (!target || !current) return;
    const send = () => { if (navigator.onLine) void sync.run(current, device).catch(() => undefined); };
    const reconnect = () => { send(); };
    const timer = window.setTimeout(send, 400);
    window.addEventListener('online', reconnect);
    return () => { window.clearTimeout(timer); window.removeEventListener('online', reconnect); };
  }, [target, current, device, sync]);
  const timezone = profileTimezone(current?.timezone_auto && device ? device : current?.timezone);
  return <ViewerTimezoneContext value={timezone}><TimezoneContext value={timezone}>{children}</TimezoneContext></ViewerTimezoneContext>;
}
