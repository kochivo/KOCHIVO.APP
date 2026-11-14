'use client';

import { createPortal } from 'react-dom';
import { usePageBarTarget } from './page-bar-slot';

export function PageBarTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const target = usePageBarTarget('title');
  return target ? createPortal(<>
    <h1 className="text-base font-semibold">{title}</h1>
    {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
  </>, target) : null;
}
