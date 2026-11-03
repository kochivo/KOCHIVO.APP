'use client';

import { useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDialogElement> {
  onDismiss: () => void;
  fallbackId: string;
  openerId?: string;
}

/** Native modality keeps the mobile overlay inert without changing the desktop detail layout. */
export function ResponsiveDialog({ onDismiss, fallbackId, openerId, className, ...props }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = (openerId && document.getElementById(openerId)) || document.activeElement;
    const desktop = window.matchMedia('(min-width: 64rem)');
    const show = () => {
      element.close();
      if (desktop.matches) element.show();
      else element.showModal();
      element.querySelector<HTMLButtonElement>('button')?.focus();
    };
    show();
    desktop.addEventListener('change', show);
    return () => {
      desktop.removeEventListener('change', show);
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      else document.getElementById(fallbackId)?.focus();
    };
  }, [fallbackId, openerId]);
  return <dialog {...props} className={cn('enter', className)} ref={dialog}
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onDismiss(); }
    }} />;
}
