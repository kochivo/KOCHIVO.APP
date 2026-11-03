import { cn } from '@/lib/cn';

/** The visual half of an on/off switch; the parent button owns role="switch" and aria-checked. */
export function SwitchTrack({ on }: { on: boolean }) {
  return <span aria-hidden className={cn('relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none',
    on ? 'bg-lime' : 'bg-ink/15')}>
    <span className={cn('absolute start-1 size-6 rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none',
      on ? 'translate-x-6 bg-on-lime rtl:-translate-x-6' : 'bg-ink')} />
  </span>;
}
