import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CaptainNav } from './captain-nav';
import { NotificationBell } from '@/features/notifications';
import { BrandMark } from '@/ui';
import { CaptainDevice } from './captain-device';
import { HeaderInstall } from './header-install';

export async function CaptainShell({ children, sidebarFooter }: { children: ReactNode; sidebarFooter?: ReactNode }) {
  const t = await getT(messages);
  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 gap-6 px-4 pb-4 lg:gap-0 lg:px-0 lg:pb-0">
      <aside className="contents w-60 min-w-0 shrink-0 flex-col gap-6 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-e lg:border-line lg:bg-surface lg:p-4 lg:flex">
        <Link href="/captain" className="hidden min-h-12 items-center gap-3 px-3 font-display text-2xl font-extrabold lg:flex"><BrandMark className="size-8" />{t('brand')}</Link>
        <CaptainNav />
        <div className="mt-auto hidden min-w-0 border-t border-line pt-4 lg:block">{sidebarFooter}</div>
      </aside>
      <div className="min-w-0 flex-1 pb-[calc(var(--nav-clearance)+1rem)] lg:px-12 lg:pb-9 lg:pt-9">
        <div className="mx-auto w-full min-w-0 max-w-[1640px]">
          <div className="sticky top-0 z-30 -mx-8 mb-6 flex items-center justify-between bg-bg/70 px-8 pb-3 backdrop-blur-md md:-mx-10 md:px-10 lg:pointer-events-none lg:mx-0 lg:mb-2 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none lg:[&>*]:pointer-events-auto pt-[max(1rem,var(--safe-top))] lg:pt-0">
            <Link href="/captain" aria-label={t('home')} className="flex min-h-12 items-center lg:invisible"><BrandMark className="size-8" /></Link>
            <div className="flex items-center gap-2"><HeaderInstall /><NotificationBell captain /></div>
          </div>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
      <CaptainDevice />
    </div>
  );
}
