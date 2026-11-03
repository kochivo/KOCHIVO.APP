import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth';
import { CaptainNav } from './captain-nav';

export function CaptainShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-2xl gap-6 p-4 lg:p-6">
      <aside className="glass sticky top-6 contents h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col gap-6 rounded-card p-4 lg:flex">
        <Link href="/captain" className="hidden min-h-12 items-center px-3 font-display text-2xl font-extrabold lg:flex">KOCHIVO</Link>
        <CaptainNav />
        <div className="mt-auto hidden lg:block [&_button]:bg-transparent [&_button]:text-muted [&_button]:hover:bg-surface-raised"><SignOutButton /></div>
      </aside>
      <div className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Link href="/captain" className="flex min-h-12 items-center font-display text-xl font-extrabold">KOCHIVO</Link>
          <div className="[&_button]:bg-transparent [&_button]:text-muted [&_button]:hover:bg-surface-raised"><SignOutButton /></div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
