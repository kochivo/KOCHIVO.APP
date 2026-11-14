import type { InputHTMLAttributes } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { label: string }

export function EditInPlace({ label, className, ...props }: Props) {
  return <label className="relative block">
    <span className="sr-only">{label}</span>
    <input {...props} type="text" className={cn('recessed min-h-12 w-full rounded-control border border-line bg-surface py-3 ps-4 pe-12 text-start text-ink focus-visible:ring-2 focus-visible:ring-lime', className)} />
    <Pencil aria-hidden className="pointer-events-none absolute end-4 top-4 size-4 text-muted" />
  </label>;
}
