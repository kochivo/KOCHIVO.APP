'use client';
import { useEffect, useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { selectPosition } from './select-position';

export function ThemedSelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  function position() {
    const button = trigger.current, panel = list.current;
    if (!button || !panel) return;
    const rtl = getComputedStyle(button).direction === 'rtl';
    const placement = selectPosition(button.getBoundingClientRect(), window.innerWidth, window.innerHeight, rtl);
    Object.assign(panel.style, { insetBlockStart: placement.top === undefined ? 'auto' : `${placement.top}px`,
      insetBlockEnd: placement.bottom === undefined ? 'auto' : `${placement.bottom}px`, insetInlineStart: `${placement.start}px`,
      width: `${placement.width}px`, maxBlockSize: `${placement.maxBlockSize}px` });
  }
  useEffect(() => {
    const update = () => { if (list.current?.matches(':popover-open')) position(); };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, []);
  return <span className="inline-block max-w-full">
    <button ref={trigger} type="button" aria-label={label} disabled={disabled} popoverTarget={id} onClick={position}
      className="glass-strong flex min-h-12 max-w-full cursor-pointer items-center gap-2 rounded-control border border-line px-[14px] text-sm text-ink disabled:cursor-default disabled:opacity-50">
      <span className="truncate">{options.find(o => o.value === value)?.label ?? label}</span><ChevronDown aria-hidden className="size-3 shrink-0 text-faint" />
    </button>
    {!disabled && <div ref={list} id={id} popover="auto" role="radiogroup" aria-label={label}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) event.currentTarget.hidePopover();
      }}
      onToggle={event => { if (event.newState === 'open') {
        (list.current?.querySelector<HTMLInputElement>('input:checked') ?? list.current?.querySelector<HTMLInputElement>('input'))?.focus();
      } }}
      onKeyDown={event => { if (event.key === 'Escape') trigger.current?.focus(); }}
      className="fixed m-0 overflow-auto rounded-control border border-line bg-surface p-1 shadow-lg" style={{ inset: 'auto' }}>
      {options.map(o => <label key={o.value} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-control px-3 text-sm ${value === o.value ? 'bg-lime-soft text-lime' : 'text-ink'}`}>
        <input type="radio" name={id} value={o.value} checked={o.value === value} className="accent-lime"
          onChange={e => { onChange(e.target.value); list.current?.hidePopover(); trigger.current?.focus(); }} />{o.label}
      </label>)}
    </div>}
  </span>;
}
