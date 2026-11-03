'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import { InstallSheet } from '@/features/install';
import { daysBetween, localDate } from '@/lib/dates';
import { accessState, whatsappUrl } from '../access';
import { playerNav, showsNav } from '../nav';
import { MyCaptainContext, useMyCaptain } from '../hooks/use-my-captain';
import { useOnline } from '../hooks/use-online';

export function PlayerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const captain = useMyCaptain();
  const online = useOnline();
  const today = localDate(new Date());
  const state = captain.data ? accessState({ ...captain.data, today }) : 'active';
  const url = whatsappUrl(captain.data?.phone ?? null);
  const left = captain.data ? daysBetween(today, captain.data.accessUntil) : 0;
  const message = state === 'ending' ?
    (left === 0 ? 'اشتراكك بيخلص النهارده' : left === 1 ? 'اشتراكك هيخلص بكره' : `اشتراكك هيخلص بعد ${left} أيام`) :
    state === 'ended' ? 'اشتراكك خلص. كلّم الكابتن عشان تجدد' :
    state === 'archived' ? 'الكابتن وقف متابعتك' : null;
  return <MyCaptainContext.Provider value={captain}>
    <div className="mx-auto max-w-lg space-y-3 px-5 pt-3" aria-live="polite">
      {!online && <p role="status" className="glass rounded-card p-4 text-sm">
        إنت أوفلاين. اللي بتسجله محفوظ وهيتبعت لما النت يرجع
      </p>}
      {message && <div role="status" className="rounded-card border border-warn bg-warn-soft p-4 text-sm">
        <p>{message}</p>
        {(state === 'ended' || state === 'archived') && url &&
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="كلّم الكابتن واتساب"
            className="mt-2 flex min-h-12 items-center justify-center rounded-control border border-lime px-4 font-bold text-lime">
            كلّم الكابتن واتساب
          </a>}
      </div>}
    </div>
    {children}
    {showsNav(pathname) && <InstallSheet />}
    {showsNav(pathname) && <BottomNav aria-label="التنقل" items={playerNav(pathname)} />}
  </MyCaptainContext.Provider>;
}
