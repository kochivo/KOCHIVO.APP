'use client';

import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { LoadingState } from '@/ui/loading-state';
import { accountMessages } from './captain-account-messages';
import { Button } from '@/ui/button';

const CaptainAccountContent = dynamic(() => import('./captain-account-content').then(module => module.CaptainAccountContent), {
  loading: () => <LoadingState />,
});

export function CaptainAccountMenu({ children, placement = 'header', onNavigate }: {
  children?: ReactNode; placement?: 'header' | 'sidebar' | 'sheet'; onNavigate?: () => void;
}) {
  const t = useT(accountMessages);
  const [loaded, setLoaded] = useState(false);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => { panel.current?.hidePopover(); onNavigate?.(); };
  const position = placement === 'sidebar' ? 'start-4 bottom-20' : placement === 'sheet' ? 'end-4 bottom-8' : 'end-4 top-[calc(var(--captain-top-inset)+3.5rem)] lg:hidden';
  return <div className={placement === 'header' ? 'lg:hidden' : 'w-full'}>
    <Button type="button" popoverTarget={id} onClick={() => setLoaded(true)} variant={'secondary'} block={false} className={`press flex min-h-12 items-center gap-inline px-stack text-start text-sm font-bold text-ink ${placement === "header" ? "" : "w-full py-stack"} `}>
      {children ?? <><UserRound className="size-5" aria-hidden="true" />{t('accountMenu')}</>}
      <ChevronDown className="ms-auto size-4 shrink-0 text-muted" aria-hidden="true" />
    </Button>
    <div ref={panel} id={id} popover="auto" className={`sheet fixed inset-auto m-0 w-60 max-w-[calc(100vw-2rem)] rounded-card border border-line p-inline text-ink shadow-xl ${position}`}>
      {loaded && <CaptainAccountContent onNavigate={close} />}
    </div>
  </div>;
}
