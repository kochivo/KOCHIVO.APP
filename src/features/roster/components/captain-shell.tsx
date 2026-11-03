import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CaptainNav } from './captain-nav';

export async function CaptainShell({ children }: { children: ReactNode }) {
  const t = await getT(messages);
  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-2xl gap-6 p-4 lg:p-6">
      <aside className="glass sticky top-6 contents h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col gap-6 rounded-card p-4 lg:flex">
        <Link href="/captain" className="hidden min-h-12 items-center px-3 font-display text-2xl font-extrabold lg:flex">{t('brand')}</Link>
        <CaptainNav />
      </aside>
      <div className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mb-6 flex items-center lg:hidden">
          <Link href="/captain" className="flex min-h-12 items-center font-display text-xl font-extrabold">{t('brand')}</Link>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
