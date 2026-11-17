import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { BrandMark } from '@/ui/brand-mark';
import { messages as appearanceMessages } from '@/ui/messages';
import { loadCaptainFrame } from './captain-frame-data';
import { frameMessages } from './captain-frame-messages';
import { CaptainFrameNav } from './captain-frame-nav';
import { CaptainTopBar } from './captain-top-bar';
import { CaptainAccountMenu } from './captain-account-menu';
import { CaptainDevice } from './captain-device';
import { KoAccountLink } from '@/features/ko-preview/server';
import { NotificationBell } from '@/features/notifications';
import { HeaderInstall } from './header-install';

export async function CaptainWorkspaceFrame({ children, sidebarFooter }: { children: ReactNode; sidebarFooter?: ReactNode }) {
  const [t, appearance, data] = await Promise.all([
    getT(frameMessages), getT(appearanceMessages), loadCaptainFrame().catch((error: unknown) => { unstable_rethrow(error); return null; }),
  ]);
  return <div className="flex min-h-dvh w-full min-w-0 gap-stack px-page-x pb-card pt-[max(1rem,var(--safe-top))] min-[760px]:py-page-y">
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[var(--safe-top)] bg-bg" />
    <style>{`[data-area="captain"] [role="radiogroup"][aria-label=${JSON.stringify(appearance('theme'))}] { display: none; }`}</style>
    <aside className="contents w-[236px] shrink-0 min-[760px]:sticky min-[760px]:top-3 min-[760px]:flex min-[760px]:h-[calc(100dvh-1.5rem)] min-[760px]:flex-col min-[760px]:overflow-y-auto min-[760px]:border-e min-[760px]:border-line-soft min-[760px]:pe-stack">
      <Link href="/captain" aria-label={t('home')} className="hidden min-h-12 items-center gap-inline px-inline font-display text-base font-extrabold tracking-[.14em] min-[760px]:flex">
        <BrandMark className="size-7" />{t('brand')}
      </Link>
      <CaptainFrameNav counts={data?.counts ?? { tasks: null, inbox: null, join: null, billing: null }} />
      <div className="mt-auto hidden space-y-stack pt-card min-[760px]:block">
        {data?.captain ? <CaptainAccountMenu placement="sidebar">
          {data.captain.avatar ? <Image src={data.captain.avatar} alt="" width={36} height={36} unoptimized className="size-9 shrink-0 rounded-full object-cover ring-1 ring-lime ring-offset-2 ring-offset-bg" />
            : <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised font-bold text-ink ring-1 ring-lime ring-offset-2 ring-offset-bg">{data.captain.name.slice(0, 1)}</span>}
          <span className="min-w-0 truncate text-row font-semibold">{data.captain.name}
            <small className="block text-micro font-normal text-muted">{t('settingsAccount')}</small>
          </span>
        </CaptainAccountMenu> : <><p role="status" className="px-inline text-xs text-muted">{t('unavailable')}</p><CaptainAccountMenu placement="sidebar" /></>}
        {sidebarFooter}
      </div>
      <CaptainDevice />
    </aside>
    <div className="min-w-0 flex-1">
      <CaptainTopBar players={data?.players ?? null} bell={<NotificationBell captain />} install={<HeaderInstall />} />
      <main className="captain-content min-w-0">{children}</main>
    </div>
    <KoAccountLink />
  </div>;
}
