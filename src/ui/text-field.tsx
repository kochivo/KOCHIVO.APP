import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className, 'aria-describedby': describedBy, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = [describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-2 text-start">
      <label htmlFor={fieldId} className="text-sm font-semibold">{label}</label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description || undefined}
        className={cn('min-h-12 min-w-0 w-full rounded-control glass px-4 text-base text-start text-ink placeholder:text-muted disabled:opacity-40', error && 'border-danger', className)}
      />
      {hint && <p id={`${fieldId}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && <p role="alert" id={`${fieldId}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
