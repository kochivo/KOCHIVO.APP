'use client';

import { createPortal } from 'react-dom';
import { usePageBarTarget } from './page-bar-slot';

export function PageBarTitle({ title, subtitle, phoneTitle, phoneSubtitle }: {
  title: string; subtitle?: string; phoneTitle?: string; phoneSubtitle?: string;
}) {
  const target = usePageBarTarget('title');
  return target ? createPortal(<>
    <h1 className="text-base font-semibold">{phoneTitle ? <><span className="max-md:hidden">{title}</span><span className="md:hidden">{phoneTitle}</span></> : title}</h1>
    {subtitle && <p className={phoneSubtitle ? 'text-xs text-muted max-md:hidden' : 'text-xs text-muted'}>{subtitle}</p>}
    {phoneSubtitle && <p className="text-xs text-muted md:hidden">{phoneSubtitle}</p>}
  </>, target) : null;
}
