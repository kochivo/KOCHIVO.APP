'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';

export function FileDisclosureEntry({ label, title, preview, children }: { label: string; title?: string; preview?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <section className="glass rounded-card border border-line-soft p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      <button aria-expanded={open} onClick={() => setOpen(!open)} className="glass flex min-h-12 items-center rounded-full px-4 text-sm">{label}</button>
    </div>
    {preview}
    {open && children}
  </section>;
}
