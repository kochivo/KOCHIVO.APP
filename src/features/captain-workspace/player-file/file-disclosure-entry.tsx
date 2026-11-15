'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Disclosure } from '@/ui/disclosure';

export function FileDisclosureEntry({ label, title, preview, children }: { label: string; title?: string; preview?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The opened editor needs the whole row: beside the side card it is too narrow to edit.
  return <section className={`glass min-w-0 rounded-card border border-line-soft p-card ${open ? 'col-span-full' : ''}`}>
    <div className="flex flex-wrap items-center justify-between gap-stack">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
    </div>
    {preview}
    <Disclosure label={label} open={open} onToggle={event => setOpen(event.currentTarget.open)} className="glass mt-stack text-sm">
      {open && children}
    </Disclosure>
  </section>;
}
