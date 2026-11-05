import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CaptainNav } from './captain-nav';
import { NotificationBell } from '@/features/notifications';
import { BrandMark } from '@/ui';
import { CaptainDevice } from './captain-device';
import { HeaderInstall } from './header-install';

export async function CaptainShell({ children }: { children: ReactNode }) {
  const t = await getT(messages);
  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 gap-6 px-4 pb-4 lg:px-0 lg:pb-6">
      <aside className="glass sticky top-[max(1.5rem,var(--safe-top))] contents h-[calc(100dvh-1.5rem-max(1.5rem,var(--safe-top)))] w-60 lg:w-56 min-w-0 shrink-0 flex-col gap-6 rounded-card p-4 lg:flex">
        <Link href="/captain" className="hidden min-h-12 items-center gap-3 px-3 font-display text-2xl font-extrabold lg:flex"><BrandMark className="size-8" />{t('brand')}</Link>
        <CaptainNav />
      </aside>
      <div className="min-w-0 flex-1 pb-[calc(var(--nav-clearance)+1rem)] lg:pb-0">
        <div className="sticky top-0 z-30 -mx-8 mb-6 flex items-center justify-between bg-bg/70 px-8 pb-3 backdrop-blur-md md:-mx-10 md:px-10 lg:pointer-events-none lg:mx-0 lg:mb-2 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none lg:[&>*]:pointer-events-auto pt-[max(1rem,var(--safe-top))] lg:pt-[max(1.5rem,var(--safe-top))]">
          <Link href="/captain" aria-label={t('home')} className="flex min-h-12 items-center lg:invisible"><BrandMark className="size-8" /></Link>
          <div className="flex items-center gap-2"><HeaderInstall /><NotificationBell captain /></div>
        </div>
        <main className="min-w-0">{children}</main>
      </div>
      <CaptainDevice />
    </div>
  );
}
