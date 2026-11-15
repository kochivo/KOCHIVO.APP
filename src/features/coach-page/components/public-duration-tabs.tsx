'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';

export function PublicDurationTabs({ options, initial }: {
  options: { days: number; label: string; content: ReactNode }[]; initial: number;
}) {
  const [selected, setSelected] = useState(initial);
  return <div className="mt-section space-y-section">
    <div className="flex flex-wrap gap-inline">
      {options.map(option => <button key={option.days} type="button"
        aria-pressed={selected === option.days}
        onClick={() => setSelected(option.days)} className={`min-h-12 rounded-full border px-page-x ${selected === option.days ? 'border-lime bg-lime-soft text-lime' : 'border-line text-muted'}`}>
        {option.label}
      </button>)}
    </div>
    {options.map(option => <div key={option.days} hidden={selected !== option.days}>
      {option.content}
    </div>)}
  </div>;
}
