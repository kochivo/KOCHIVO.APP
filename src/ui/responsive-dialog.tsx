'use client';

import { useEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDialogElement> {
  onDismiss: () => void;
  fallbackId: string;
  openerId?: string;
  modal?: boolean;
  onClose?: () => void;
  footer?: ReactNode;
}

/** Native modality keeps the mobile overlay inert without changing the desktop detail layout. */
export function ResponsiveDialog({ onDismiss, fallbackId, openerId, modal = false, className, title, onClose, footer, children, ...props }: Props) {
  const t = useT(messages);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = (openerId && document.getElementById(openerId)) || document.activeElement;
    const desktop = window.matchMedia('(min-width: 64rem)');
    const show = () => {
      element.close();
      if (desktop.matches && !modal) element.show();
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
  }, [fallbackId, openerId, modal]);
  return <dialog aria-label={title} {...props} className={cn('enter sheet', className)} ref={dialog}
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onDismiss(); }
    }}>
    {(title || onClose) && <header className="captain-dialog-header flex items-center justify-between gap-4">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}
      <button type="button" onClick={onClose ?? onDismiss} aria-label={t('closeDialog')}
        className="press ms-auto flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime">
        <X aria-hidden className="size-5" />
      </button>
    </header>}
    {title || footer ? <div className="captain-dialog-body">{children}</div> : children}
    {footer && <footer className="captain-dialog-footer">{footer}</footer>}
  </dialog>;
}
