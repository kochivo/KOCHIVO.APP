'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Ellipsis } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { buttonClass } from './button';
import { messages } from './page-bar/messages';

export function PageBarMenu({ children }: { children: ReactNode }) {
  const t = useT(messages);
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    function closeOutside(event: Event) {
      const details = menu.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);
  return <details ref={menu} data-page-bar-menu className="relative shrink-0 md:hidden"
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !event.currentTarget.open) return;
      event.preventDefault();
      event.currentTarget.open = false;
      trigger.current?.focus();
    }}
    onClick={event => {
      if (!(event.target instanceof Element) || !event.target.closest('a, button')) return;
      trigger.current?.focus();
      event.currentTarget.open = false;
    }}>
    <summary ref={trigger} aria-label={t('more')} className={buttonClass({
      variant: 'secondary', block: false, className: 'size-12 cursor-pointer list-none px-0 [&::-webkit-details-marker]:hidden',
    })}><Ellipsis aria-hidden className="size-5" /></summary>
    <div className="sheet absolute end-0 top-full z-30 mt-inline flex w-max max-w-[calc(100vw-2*var(--spacing-page-x))] flex-col gap-inline rounded-card border border-line p-inline shadow-xl">
      {children}
    </div>
  </details>;
}
