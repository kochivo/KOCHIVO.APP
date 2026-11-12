'use client';
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export function ThemedSelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  return <details className="group relative inline-block max-w-full" onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false;
  }} onKeyDown={e => {
    if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={label} aria-disabled={disabled || undefined} onClick={e => { if (disabled) e.preventDefault(); }}
      className="glass-strong flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-control border border-line px-[14px] text-sm text-ink aria-disabled:cursor-default aria-disabled:opacity-50">
      <span className="truncate">{options.find(o => o.value === value)?.label ?? label}</span><ChevronDown aria-hidden className="size-3 shrink-0 text-faint" />
    </summary>
    {!disabled && <div className="absolute start-0 z-20 mt-1 max-h-72 min-w-full max-w-[calc(100vw-3rem)] overflow-auto rounded-control border border-line bg-surface p-1 shadow-lg">
      {options.map(o => <label key={o.value} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-control px-3 text-sm ${value === o.value ? 'bg-lime-soft text-lime' : 'text-ink'}`}>
        <input type="radio" name={id} value={o.value} checked={o.value === value} className="accent-lime"
          onChange={e => { onChange(e.target.value); const details = e.currentTarget.closest('details');
            if (details) { details.open = false; details.querySelector('summary')?.focus(); }
          }} />{o.label}
      </label>)}
    </div>}
  </details>;
}
