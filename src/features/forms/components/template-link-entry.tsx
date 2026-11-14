'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uuidv7 } from '@/core/offline/ids';
import type { ReactNode } from 'react';

export function TemplateLinkEntry({ href, children, primary = false, card = false }: { href: string; children: ReactNode; primary?: boolean; card?: boolean }) {
  const router = useRouter();
  return <Link href={href} prefetch={false} className={card ? 'glass press flex min-h-12 cursor-pointer flex-col items-start gap-2 rounded-card border border-line p-4 text-start text-sm hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-lime'
    : `inline-flex min-h-12 items-center gap-2 rounded-full ${primary ? 'bg-lime px-5 text-sm font-semibold text-on-lime' : 'glass px-[14px] text-[12.5px] text-muted'}`}
    onClick={e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); router.push(`${href}&draft=${uuidv7()}`);
    }}>{children}</Link>;
}
