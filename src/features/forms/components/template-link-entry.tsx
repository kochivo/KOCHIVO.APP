'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uuidv7 } from '@/core/offline/ids';
import type { ReactNode } from 'react';
import { buttonClass } from '@/ui/button';

export function TemplateLinkEntry({ href, children, primary = false, card = false }: { href: string; children: ReactNode; primary?: boolean; card?: boolean }) {
  const router = useRouter();
  return <Link href={href} prefetch={false} className={buttonClass({ variant: (card) ? 'secondary' : (primary) ? 'primary' : 'secondary', block: false, className: card ? "press flex min-h-12 cursor-pointer flex-col items-start gap-inline p-card text-start text-sm focus-visible:ring-2 focus-visible:ring-lime"
    : `inline-flex min-h-12 items-center gap-inline ${primary ? "px-page-x text-sm font-semibold" : "px-card text-xs text-muted"} ` })}
    onClick={e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); router.push(`${href}&draft=${uuidv7()}`);
    }}>{children}</Link>;
}
