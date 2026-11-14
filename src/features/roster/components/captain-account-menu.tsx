'use client';

import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { LoadingState } from '@/ui/loading-state';
import { accountMessages } from './captain-account-messages';

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
    <button type="button" popoverTarget={id} onClick={() => setLoaded(true)} className={`press glass flex min-h-12 items-center gap-2 rounded-control px-3 text-start text-sm font-bold text-ink ${placement === 'header' ? '' : 'w-full border border-line py-2.5'}`}>
      {children ?? <><UserRound className="size-5" aria-hidden="true" />{t('accountMenu')}</>}
      <ChevronDown className="ms-auto size-4 shrink-0 text-muted" aria-hidden="true" />
    </button>
    <div ref={panel} id={id} popover="auto" className={`sheet fixed inset-auto m-0 w-60 max-w-[calc(100vw-2rem)] rounded-card border border-line p-2 text-ink shadow-xl ${position}`}>
      {loaded && <CaptainAccountContent onNavigate={close} />}
    </div>
  </div>;
}
