'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const Panel = dynamic(() => import('./home-panel').then(module => module.HomePanel));
export function HomePanelEntry({ title, children, content, className, id }: {
  title: string; children: ReactNode; content: ReactNode; className: string; id: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button id={id} type="button" aria-label={title} aria-haspopup="dialog" aria-expanded={open}
      className={className} onClick={() => setOpen(true)}>{children}</button>
    {open && <Panel title={title} openerId={id} onClose={() => setOpen(false)}>{content}</Panel>}
  </>;
}
