import type { InputHTMLAttributes } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { clickableClass } from './button';

export const editableFieldClass = cn(clickableClass, 'rounded-control border border-line bg-surface hover:bg-surface-raised');

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { label: string }

export function EditInPlace({ label, className, ...props }: Props) {
  return <label className="relative block">
    <span className="sr-only">{label}</span>
    <input {...props} type="text" className={cn(editableFieldClass, 'recessed min-h-12 w-full py-3 ps-4 pe-12 text-start text-ink', className)} />
    <Pencil aria-hidden className="pointer-events-none absolute end-4 top-4 size-4 text-muted" />
  </label>;
}
