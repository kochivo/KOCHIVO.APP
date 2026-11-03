'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';

export function SiteMenu({ children, openLabel, closeLabel }: {
  children: ReactNode; openLabel: string; closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); button.current?.focus(); };
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target)
        && !button.current?.contains(event.target)) close();
    };
    const desktop = matchMedia('(min-width: 48rem)');
    const resize = () => {
      if (!desktop.matches) return;
      if (panel.current?.contains(document.activeElement) || document.activeElement === button.current) {
        button.current?.closest('header')?.querySelector<HTMLElement>('a.marketing-primary')?.focus();
      }
      setOpen(false);
    };
    desktop.addEventListener('change', resize);
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);
  const Icon = open ? X : Menu;
  return <div className="md:hidden">
    <button ref={button} type="button" className="marketing-ghost min-h-12 min-w-12 text-ink"
      aria-label={open ? closeLabel : openLabel} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); if (open) button.current?.focus(); }}>
      <Icon size={24} aria-hidden="true" />
    </button>
    <nav ref={panel} id={id} hidden={!open} aria-label={openLabel}
      className="glass-strong absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line p-4 text-ink"
      onClick={event => {
        if ((event.target as HTMLElement).closest('a')) { setOpen(false); button.current?.focus(); }
      }}>
      {children}
    </nav>
  </div>;
}
