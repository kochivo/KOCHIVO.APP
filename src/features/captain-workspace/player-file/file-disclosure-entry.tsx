'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';

export function FileDisclosureEntry({ label, title, preview, children }: { label: string; title?: string; preview?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The opened editor needs the whole row: beside the side card it is too narrow to edit.
  return <section className={`glass min-w-0 rounded-card border border-line-soft p-4 ${open ? 'col-span-full' : ''}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="glass press flex min-h-12 cursor-pointer items-center rounded-full px-4 text-sm focus-visible:ring-2 focus-visible:ring-lime">{label}</button>
    </div>
    {preview}
    {open && children}
  </section>;
}
